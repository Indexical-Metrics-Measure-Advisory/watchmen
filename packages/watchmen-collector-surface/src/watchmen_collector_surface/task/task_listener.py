import logging
from traceback import format_exc
from typing import List, Optional, Callable

from watchmen_collector_kernel.common import CollectorKernelException, ask_exception_max_length
from watchmen_collector_kernel.model import Dependence, ExecutionStatus, TaskType
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

	def find_task_and_locked(self, task: ScheduledTask) -> ExecutionStatus:
		try:
			self.scheduled_task_service.begin_transaction()
			task = self.scheduled_task_service.find_and_lock_by_id(task.taskId)
			if task:
				if task.status == Status.INITIAL.value:
					self.scheduled_task_service.update(self.change_status(task, Status.EXECUTING.value))
					result = ExecutionStatus.SHOULD_RUN
				elif task.status == Status.EXECUTING.value:
					result = ExecutionStatus.EXECUTING_BY_OTHERS
				else:
					raise Exception(f"The status : {task.status} is not supported in find_task_and_locked. The task is {task.taskId}")
			else:
				result = ExecutionStatus.FINISHED
			self.scheduled_task_service.commit_transaction()
			return result
		finally:
			self.scheduled_task_service.close_transaction()

	def task_listener(self) -> None:
		self.process_tasks()

	def process_tasks(self):
		unfinished_tasks = self.find_tasks_and_locked()
		if unfinished_tasks:
			ArrayHelper(unfinished_tasks).map(self.process_task)

	def process_task(self, task: ScheduledTask) -> ScheduledTask:
		try:
			if self.check_dependent_tasks_finished(task):
				self.executing_task(task)
				return self.task_service.finish_task(task, Status.SUCCESS.value)
			else:
				return self.restore_task(task)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			return self.task_service.finish_task(task, Status.FAIL.value, self.truncated_string(format_exc()))

	def consume_task(self, task: ScheduledTask) -> ScheduledTask:
		try:
			self.executing_task(task)
			return self.task_service.finish_task(task, Status.SUCCESS.value)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			return self.task_service.finish_task(task, Status.FAIL.value, self.truncated_string(format_exc()))

	def executing_task(self, task: ScheduledTask):
		if task.type == TaskType.DEFAULT.value:
			self.task_service.consume_task(task, pipeline_data)
		elif task.type == TaskType.RUN_PIPELINE.value:
			self.task_service.consume_task(task, run_pipeline)

	# noinspection PyMethodMayBeStatic
	def truncated_string(self, long_string: str) -> str:
		max_length = ask_exception_max_length()
		truncated_string = long_string[:max_length]
		return truncated_string

	def restore_task(self, task: ScheduledTask) -> ScheduledTask:
		return self.scheduled_task_service.update_task(self.change_status(task, Status.INITIAL.value))

	def check_dependent_tasks_finished(self, task: ScheduledTask) -> bool:
		return self.check_parent_tasks_status(task) and self.check_dependence_tasks_status(task)

	def check_parent_tasks_status(self, task: ScheduledTask) -> bool:
		def compare(task_id: int, another_task_id: int) -> int:
			return task_id - another_task_id
		parent_task_ids = ArrayHelper(task.parentTaskId).sort(compare).to_list()
		for parent_task_id in parent_task_ids:
			result_task = self.process_parent_task(parent_task_id)
			if result_task.isFinished:
				continue
			else:
				return False
		return True

	def process_parent_task(self, parent_task_id: int) -> ScheduledTask:
		parent_task = self.scheduled_task_service.find_task_by_id(parent_task_id)
		if parent_task:
			return self.process_dependent_task(parent_task, self.executing_task)
		else:
			parent_task_history = self.scheduled_task_history_service.find_task_by_id(parent_task_id)
			if parent_task_history:
				return parent_task_history
			else:
				raise CollectorKernelException(f"dependent task id: {parent_task_id} is not existed")

	def check_dependence_tasks_status(self, task: ScheduledTask) -> bool:
		dependencies = ArrayHelper(task.dependOn).to_list()
		for dependence in dependencies:
			depend_tasks = self.scheduled_task_service.find_model_dependent_tasks(dependence.modelName,
			                                                                      dependence.objectId, task.eventId,
			                                                                      task.tenantId)
			for depend_task in depend_tasks:
				result_task = self.process_dependent_task(depend_task, self.process_task)
				if result_task.isFinished:
					continue
				else:
					return False
		return True

	def process_dependent_task(self, dependent_task: ScheduledTask, func: Callable[[ScheduledTask], ScheduledTask]) -> ScheduledTask:
		try:
			self.scheduled_task_service.begin_transaction()
			task = self.scheduled_task_service.find_and_lock_by_id(dependent_task.taskId)
			if task:
				if task.status == Status.INITIAL.value:
					self.scheduled_task_service.update(self.change_status(task, Status.EXECUTING.value))
					result = func(dependent_task)
				elif task.status == Status.EXECUTING.value:
					result = dependent_task
				else:
					raise Exception(
						f"The status : {task.status} is not supported in find_task_and_locked. The task is {task.taskId}")
			else:
				result =  dependent_task
			self.scheduled_task_service.commit_transaction()
			return result
		finally:
			self.scheduled_task_service.close_transaction()