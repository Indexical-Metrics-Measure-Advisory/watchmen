import logging
from traceback import format_exc
from typing import List, Dict, Optional
from abc import ABC, abstractmethod

from watchmen_collector_kernel.service.task_service import TaskService

from watchmen_collector_kernel.common import ask_exception_max_length, ask_grouped_task_data_size_threshold
from watchmen_collector_kernel.model import TaskType, ChangeDataJson
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.model import ScheduledTask, Status
from watchmen_collector_kernel.service import get_task_service
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service, \
	get_scheduled_task_history_service, get_change_data_json_service, get_change_data_json_history_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from .handler import pipeline_data, run_pipeline
from watchmen_collector_surface.settings import ask_task_listener_wait

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


class TaskExecutorSPI(ABC):

	@abstractmethod
	def process_scheduled_task(self, task: ScheduledTask) -> ScheduledTask:
		pass

	@abstractmethod
	def executing_task(self, task: ScheduledTask):
		pass


class TaskExecutor(TaskExecutorSPI):

	def __init__(self, task_service: TaskService):
		self.task_service = task_service

	def process_scheduled_task(self, task: ScheduledTask):
		self.executing_task(task)

	def executing_task(self, task: ScheduledTask):
		pass


class DataTaskExecutor(TaskExecutor):
	def executing_task(self, task: ScheduledTask):
		pipeline_data(task.topicCode, task.content, task.tenantId)


class PipelineTaskExecutor(TaskExecutor):
	def executing_task(self, task: ScheduledTask):
		run_pipeline(task.topicCode, task.content, task.tenantId, task.pipelineId)


def get_task_executor(task_service: TaskService, task: ScheduledTask) -> TaskExecutorSPI:
	if task.type == TaskType.DEFAULT.value:
		return DataTaskExecutor(task_service)
	elif task.type == TaskType.RUN_PIPELINE.value:
		return PipelineTaskExecutor(task_service)
	elif task.type == TaskType.GROUP.value:
		return DataTaskExecutor(task_service)


class TaskListener:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.scheduled_task_history_service = get_scheduled_task_history_service(self.storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.task_service = get_task_service(self.storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)
		self.data_size_threshold = ask_grouped_task_data_size_threshold()

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
		remaining_tasks = ArrayHelper(unfinished_tasks).to_map(lambda one_task: one_task.taskId,
		                                                       lambda one_task: one_task)

		def release_remaining_tasks():
			for task_id, task in remaining_tasks.items():
				self.restore_task(task)

		for unfinished_task in unfinished_tasks:

			del remaining_tasks[unfinished_task.taskId]

			if len(unfinished_task.changeJsonIds) > self.data_size_threshold:
				release_remaining_tasks()

			finished_json = []
			try:
				for change_json_id in unfinished_task.changeJsonIds:
					change_json = self.get_change_data_json(change_json_id)
					if change_json:
						try:
							self.process_sub_tasks(unfinished_task, change_json)
						finally:
							self.update_change_json_result(change_json)
							finished_json.append(change_json.changeJsonId)

				task = self.update_task_status(unfinished_task, Status.SUCCESS.value)
				self.handle_execution_result(task)
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
				task = self.update_task_status(unfinished_task, Status.FAIL.value, self.truncated_string(format_exc()))
				self.handle_execution_result(task)
			finally:
				unfinished_json_ids = [change_json_id for change_json_id in unfinished_task.changeJsonIds if change_json_id not in finished_json]
				for unfinished_json_id in unfinished_json_ids:
					unfinished_change_json = self.get_change_data_json(unfinished_json_id)
					self.update_change_json_result(unfinished_change_json)

	# noinspection PyMethodMayBeStatic
	def update_task_status(self, task: ScheduledTask, status: int, result: str = None) -> ScheduledTask:
		task.isFinished = True
		task.status = status
		task.result = result
		return task

	def process_sub_tasks(self, sub_task: ScheduledTask, change_data_json: ChangeDataJson):
		def get_content(change_json: ChangeDataJson) -> Optional[Dict]:
			if sub_task.type == TaskType.RUN_PIPELINE.value:
				if "data_" in change_json.content:
					return change_json.content.get("data_")
				else:
					return change_json.content
			else:
				return change_json.content

		sub_task.content = get_content(change_data_json)
		task_executor = get_task_executor(self.task_service, sub_task)
		task_executor.process_scheduled_task(sub_task)

	def get_change_data_json(self, change_json_id: int) -> ChangeDataJson:
		return self.change_json_service.find_json_by_id(change_json_id)

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

	def handle_execution_result(self, task: ScheduledTask) -> ScheduledTask:
		return self.task_service.finish_task(task)

	# noinspection PyTypeChecker
	def update_change_json_result(self, change_json: ChangeDataJson):
		try:
			self.change_json_history_service.begin_transaction()
			change_json.status = Status.SUCCESS.value
			self.change_json_history_service.create(change_json)
			self.change_json_service.delete(change_json.changeJsonId)
			self.change_json_history_service.commit_transaction()
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_service.close_transaction()

	# noinspection PyMethodMayBeStatic
	def truncated_string(self, long_string: str) -> str:
		max_length = ask_exception_max_length()
		truncated_string = long_string[:max_length]
		return truncated_string
