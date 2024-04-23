import logging
from traceback import format_exc
from typing import List, Dict
from abc import ABC, abstractmethod

from watchmen_collector_kernel.service.task_service import TaskService

from watchmen_collector_kernel.common import ask_exception_max_length, ask_grouped_task_data_size_threshold
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


class TaskExecutorSPI(ABC):

	@abstractmethod
	def is_data_size_exceeds_threshold(self, task: ScheduledTask) -> bool:
		pass

	@abstractmethod
	def process_scheduled_task(self, task: ScheduledTask) -> ScheduledTask:
		pass

	@abstractmethod
	def executing_task(self, task: ScheduledTask):
		pass


class DefaultTaskExecutor(TaskExecutorSPI):

	def __init__(self, task_service: TaskService):
		self.task_service = task_service

	def is_data_size_exceeds_threshold(self, task: ScheduledTask) -> bool:
		return False

	def process_scheduled_task(self, task: ScheduledTask) -> ScheduledTask:
		try:
			self.executing_task(task)
			return self.task_service.finish_task(task, Status.SUCCESS.value)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			return self.task_service.finish_task(task, Status.FAIL.value, self.truncated_string(format_exc()))

	def executing_task(self,  task: ScheduledTask):
		self.task_service.consume_task(task, pipeline_data)

	# noinspection PyMethodMayBeStatic
	def truncated_string(self, long_string: str) -> str:
		max_length = ask_exception_max_length()
		truncated_string = long_string[:max_length]
		return truncated_string


class PipelineTaskExecutor(DefaultTaskExecutor):

	def executing_task(self,  task: ScheduledTask):
		self.task_service.consume_task(task, run_pipeline)


class GroupedTaskExecutor(DefaultTaskExecutor):

	def __init__(self, task_service: TaskService):
		super().__init__(task_service)
		self.data_size_threshold = ask_grouped_task_data_size_threshold()

	def is_data_size_exceeds_threshold(self, task: ScheduledTask) -> bool:
		data = task.content.get("data")
		if len(data) > self.data_size_threshold:
			return True
		else:
			return False


def get_task_executor(task_service: TaskService, task: ScheduledTask) -> TaskExecutorSPI:
	if task.type == TaskType.DEFAULT.value:
		return DefaultTaskExecutor(task_service)
	elif task.type == TaskType.RUN_PIPELINE.value:
		return PipelineTaskExecutor(task_service)
	elif task.type == TaskType.GROUP.value:
		return GroupedTaskExecutor(task_service)


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

	def task_listener(self) -> None:
		self.process_tasks()

	def process_tasks(self):
		unfinished_tasks = self.find_tasks_and_locked()
		remaining_tasks = ArrayHelper(unfinished_tasks).to_map(lambda one_task: one_task.taskId, lambda one_task: one_task)

		def release_remaining_tasks():
			for task_id, task in remaining_tasks.items():
				self.restore_task(task)

		for unfinished_task in unfinished_tasks:
			del remaining_tasks[unfinished_task.taskId]
			task_executor = get_task_executor(self.task_service, unfinished_task)
			if task_executor.is_data_size_exceeds_threshold(unfinished_task):
				release_remaining_tasks()
				task_executor.process_scheduled_task(unfinished_task)
				break
			else:
				task_executor.process_scheduled_task(unfinished_task)

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

	def restore_task(self, task: ScheduledTask) -> ScheduledTask:
		return self.scheduled_task_service.update_task(self.change_status(task, Status.INITIAL.value))

	# noinspection PyMethodMayBeStatic
	def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
		task.status = status
		return task
