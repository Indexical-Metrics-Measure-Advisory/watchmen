import logging
from enum import Enum
from traceback import format_exc
from typing import List, Callable, Tuple

from watchmen_collector_kernel.common import ask_exception_max_length
from watchmen_collector_kernel.model import TaskType
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.model import ScheduledTask, Status
from watchmen_collector_kernel.service import get_task_service
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service, \
	get_scheduled_task_history_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from .handler import pipeline_data, run_pipeline
from watchmen_collector_surface.settings import ask_task_listener_wait

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


class DependentTaskExecutionStatus(int, Enum):
	EXECUTED = 1,
	COMPETED = 2,
	FINISHED = 3,
	UNFINISHED = 4


class TaskListener:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.scheduled_task_history_service = get_scheduled_task_history_service(self.storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.task_service = get_task_service(self.storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)

	def create_thread(self, scheduler=None) -> None:
		scheduler.add_job(TaskListener.event_loop_run, 'interval', seconds=ask_task_listener_wait(), args=(self,))

	def event_loop_run(self):
		try:
			self.task_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

	# noinspection PyMethodMayBeStatic
	def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
		task.status = status
		return task

	def find_tasks_and_locked(self) -> List[ScheduledTask]:
		try:
			self.scheduled_task_service.begin_transaction()
			tasks = self.scheduled_task_service.find_tasks_and_locked()
			results = ArrayHelper(tasks).map(
				lambda task: self.change_status(task, Status.EXECUTING.value)
			).map(
				lambda task: self.scheduled_task_service.update(task)
			).to_list()
			self.scheduled_task_service.commit_transaction()
			return results
		finally:
			self.scheduled_task_service.close_transaction()

	def task_listener(self) -> None:
		self.process_tasks()

	def process_tasks(self):
		unfinished_tasks = self.find_tasks_and_locked()
		if unfinished_tasks:
			ArrayHelper(unfinished_tasks).map(self.consume_task)

	def process_task(self, task: ScheduledTask) -> ScheduledTask:
		if self.is_dependence_tasks_finished(task):
			return self.executing_task(task)
		else:
			return self.restore_task(task)

	def executing_task(self, task: ScheduledTask) -> ScheduledTask:
		if task.parentTaskId:
			unfinished_tasks = self.scheduled_task_service.find_model_dependent_tasks(task.modelName, task.objectId, task.eventId, task.tenantId)
			for unfinished_task in unfinished_tasks:
				if unfinished_task.taskId < task.taskId:
					status, finished_task = self.process_dependent_task(unfinished_task, self.consume_task)
					if status == DependentTaskExecutionStatus.FINISHED:
						continue
					else:
						return self.restore_task(task)
				elif unfinished_task.taskId == task.taskId:
					task = self.consume_task(unfinished_task)
				else:
					break
		else:
			return self.consume_task(task)

	def consume_task(self, task: ScheduledTask) -> ScheduledTask:
		try:
			self.task_consume_service(task)
			return self.task_service.finish_task(task, Status.SUCCESS.value)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			return self.task_service.finish_task(task, Status.FAIL.value, self.truncated_string(format_exc()))

	def task_consume_service(self, task: ScheduledTask):
		if task.type == TaskType.DEFAULT.value:
			self.task_service.consume_task(task, pipeline_data)
		elif task.type == TaskType.RUN_PIPELINE.value:
			self.task_service.consume_task(task, run_pipeline)
		elif task.type == TaskType.GROUP.value:
			data = task.content.get("data")
			ArrayHelper(data).each(lambda one: pipeline_data(task.topicCode, one, task.tenantId))

	# noinspection PyMethodMayBeStatic
	def truncated_string(self, long_string: str) -> str:
		max_length = ask_exception_max_length()
		truncated_string = long_string[:max_length]
		return truncated_string

	def restore_task(self, task: ScheduledTask) -> ScheduledTask:
		return self.scheduled_task_service.update_task(self.change_status(task, Status.INITIAL.value))

	def is_dependence_tasks_finished(self, task: ScheduledTask) -> bool:
		dependencies = ArrayHelper(task.dependOn).to_list()
		for dependence in dependencies:
			depend_tasks = self.scheduled_task_service.find_model_dependent_tasks(dependence.modelName,
			                                                                      dependence.objectId, task.eventId,
			                                                                      task.tenantId)
			for depend_task in depend_tasks:
				status, processed_task = self.process_dependent_task(depend_task, self.process_task)
				if status == DependentTaskExecutionStatus.FINISHED:
					continue
				else:
					return False
		return True

	def process_dependent_task(self, task: ScheduledTask,
	                           func: Callable[[ScheduledTask], ScheduledTask]) -> Tuple[DependentTaskExecutionStatus, ScheduledTask]:

		status = self.check_dependent_task_status(task)
		if status == DependentTaskExecutionStatus.COMPETED:
			return DependentTaskExecutionStatus.COMPETED, task

		try:
			self.scheduled_task_service.begin_transaction()
			locked_task = self.scheduled_task_service.find_one_and_lock_nowait(task.task_id)
			if locked_task:
				self.scheduled_task_service.update(self.change_status(task, Status.EXECUTING.value))
				self.scheduled_task_service.commit_transaction()
				task = func(task)
				if task.isFinished:
					return DependentTaskExecutionStatus.FINISHED, task
				else:
					return DependentTaskExecutionStatus.UNFINISHED, task
			else:
				self.scheduled_task_service.rollback_transaction()
				dependent_task = self.scheduled_task_service.find_task_by_id(task.task_id)
				if dependent_task:
					return DependentTaskExecutionStatus.COMPETED, dependent_task
				else:
					return DependentTaskExecutionStatus.FINISHED, task
		finally:
			self.scheduled_task_service.close_transaction()

	# noinspection PyMethodMayBeStatic
	def check_dependent_task_status(self, task: ScheduledTask) -> DependentTaskExecutionStatus:
		if task.status == Status.INITIAL.value:
			return DependentTaskExecutionStatus.EXECUTED
		elif task.status == Status.EXECUTING.value:
			return DependentTaskExecutionStatus.COMPETED
		else:
			raise Exception(
				f"The status : {task.status} is not supported in find_task_and_locked. The task is {task.taskId}")

