import json
import logging
from abc import ABC, abstractmethod
from traceback import format_exc
from typing import List, Dict, Optional, Tuple

from watchmen_collector_kernel.common import ask_exception_max_length, ask_grouped_task_data_size_threshold
from watchmen_collector_kernel.model import ScheduledTask, Status
from watchmen_collector_kernel.model import TaskType, ChangeDataJson
from watchmen_collector_kernel.service import get_task_service, ask_collector_storage
from watchmen_collector_kernel.service.task_service import TaskService
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service, \
	get_scheduled_task_history_service, get_change_data_json_service, get_change_data_json_history_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_utilities import ArrayHelper
from .handler import pipeline_data, run_pipeline
from watchmen_serverless_lambda.common import ask_serverless_task_distribution_max_batch_size, ask_serverless_queue_url
from watchmen_serverless_lambda.model import ActionType
from watchmen_serverless_lambda.queue import SQSSender

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

	async def process_scheduled_task(self, task: ScheduledTask):
		await self.executing_task(task)
	
	@abstractmethod
	async def executing_task(self, task: ScheduledTask):
		pass


class DataTaskExecutor(TaskExecutor):
	async def executing_task(self, task: ScheduledTask):
		await pipeline_data(task.topicCode, task.content, task.tenantId)


class PipelineTaskExecutor(TaskExecutor):
	async def executing_task(self, task: ScheduledTask):
		await run_pipeline(task.topicCode, task.content, task.tenantId, task.pipelineId)


def get_task_executor(task_service: TaskService, task: ScheduledTask) -> TaskExecutorSPI:
	if task.type == TaskType.DEFAULT.value:
		return DataTaskExecutor(task_service)
	elif task.type == TaskType.RUN_PIPELINE.value:
		return PipelineTaskExecutor(task_service)
	elif task.type == TaskType.GROUP.value:
		return DataTaskExecutor(task_service)


class TaskListener:

	def __init__(self, tenant_id: str):
		self.tenant_id = tenant_id
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
		self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
		self.change_json_service = get_change_data_json_service(self.collector_storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.collector_storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.scheduled_task_history_service = get_scheduled_task_history_service(self.collector_storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.task_service = get_task_service(self.collector_storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)
		self.data_size_threshold = ask_grouped_task_data_size_threshold()
		self.sender = SQSSender(queue_url=ask_serverless_queue_url(),
		                        max_retries=3,
		                        base_delay=0.5)

	
	def task_listener(self) -> None:
		try:
			self.process_tasks()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		
	def process_tasks(self):
		unfinished_tasks = self.find_tasks_and_locked()
		if unfinished_tasks:
			self.send_task_messages(unfinished_tasks)
	
	def find_tasks_and_locked(self) -> Optional[List[ScheduledTask]]:
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
		
	# noinspection PyMethodMayBeStatic
	def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
		task.status = status
		return task
	
	def send_task_messages(self, tasks: List[ScheduledTask]) -> Tuple[Dict, Dict]:
		# batch send messages
		batch_size: int = ask_serverless_task_distribution_max_batch_size()
		messages = []
		for i in range(0, len(tasks), batch_size):
			batch = tasks[i:i + batch_size]
			message = {
				'Id': self.snowflake_generator.next_id(),
				'MessageBody': json.dumps({'action': ActionType.SCHEDULED_TASK,
				                           'tenant_id': self.tenant_id,
				                           'tasks': batch}),
				'MessageGroupId': self.snowflake_generator.next_id(),
				'MessageDeduplicationId': self.snowflake_generator.next_id()
			}
			messages.append(message)
		
		successes, failures = self.sender.send_batch(messages)
		return successes, failures
	

class TaskProcessor:
	
	def __init__(self, tenant_id: str):
		self.tenant_id = tenant_id
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
		self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
		self.change_json_service = get_change_data_json_service(self.collector_storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.collector_storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.scheduled_task_history_service = get_scheduled_task_history_service(self.collector_storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.task_service = get_task_service(self.collector_storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)
		self.data_size_threshold = ask_grouped_task_data_size_threshold()
		
	async def process_task_with_change_data_json(self, unfinished_task: ScheduledTask):
		finished_json_ids = []
		try:
			for change_json_id in unfinished_task.changeJsonIds:
				change_json = self.get_change_data_json(change_json_id)
				if change_json:
					if self.is_duplicated(change_json):
						self.delete_change_json(change_json)
					else:
						await self.process_sub_tasks(unfinished_task, change_json)
						self.update_change_json_result(change_json, Status.SUCCESS.value)
						finished_json_ids.append(change_json.changeJsonId)
			
			finished_task = self.update_task_status(unfinished_task, Status.SUCCESS.value)
			self.handle_execution_result(finished_task)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			unfinished_json_ids = [change_json_id for change_json_id in unfinished_task.changeJsonIds if
			                       change_json_id not in finished_json_ids]
			self.handle_unfinished_change_json(unfinished_json_ids)
			finished_task = self.update_task_status(unfinished_task, Status.FAIL.value,
			                                        self.truncated_string(format_exc()))
			self.handle_execution_result(finished_task)
			
	def is_duplicated(self, change_data_json: ChangeDataJson) -> bool:
		existed_json = self.change_json_history_service.find_by_resource_id(change_data_json.resourceId)
		if existed_json:
			return True
		else:
			return False

	def handle_unfinished_change_json(self, unfinished_change_json_ids: List):
		for unfinished_json_id in unfinished_change_json_ids:
			try:
				unfinished_change_json = self.get_change_data_json(unfinished_json_id)
				if unfinished_change_json:
					self.update_change_json_result(unfinished_change_json, Status.FAIL.value)
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)

	# noinspection PyMethodMayBeStatic
	def update_task_status(self, task: ScheduledTask, status: int, result: str = None) -> ScheduledTask:
		task.isFinished = True
		task.status = status
		task.result = result
		return task

	async def process_sub_tasks(self, sub_task: ScheduledTask, change_data_json: ChangeDataJson):
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
		await task_executor.process_scheduled_task(sub_task)

	# noinspection PyTypeChecker
	def get_change_data_json(self, change_json_id: int) -> ChangeDataJson:
		return self.change_json_service.find_json_by_id(change_json_id)

	def restore_task(self, task: ScheduledTask) -> ScheduledTask:
		return self.scheduled_task_service.update_task(self.change_status(task, Status.INITIAL.value))

	# noinspection PyMethodMayBeStatic
	def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
		task.status = status
		return task

	def handle_execution_result(self, task: ScheduledTask) -> ScheduledTask:
		return self.task_service.finish_task(task)

	# noinspection PyTypeChecker
	def update_change_json_result(self, change_json: ChangeDataJson, status: int):
		try:
			self.change_json_history_service.begin_transaction()
			change_json.status = status
			self.change_json_history_service.create(change_json)
			self.change_json_service.delete(change_json.changeJsonId)
			self.change_json_history_service.commit_transaction()
		except Exception as e:
			self.change_json_history_service.rollback_transaction()
			raise e
		finally:
			self.change_json_history_service.close_transaction()

	# noinspection PyTypeChecker
	def delete_change_json(self, change_json: ChangeDataJson):
		try:
			self.change_json_service.begin_transaction()
			self.change_json_service.delete(change_json.changeJsonId)
			self.change_json_service.commit_transaction()
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