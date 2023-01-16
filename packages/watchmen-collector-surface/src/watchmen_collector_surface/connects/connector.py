from abc import ABC
from typing import Dict, List, Callable

from watchmen_collector_kernel.lock import get_competitive_lock_service
from watchmen_collector_kernel.model import CollectorCompetitiveLock, CollectorTask, Dependency, ResultStatus
from watchmen_collector_kernel.task import get_task_service
from watchmen_model.common import CollectorTaskId
from .handler import pipeline_data
from watchmen_meta.common import ask_snowflake_generator
from watchmen_storage import TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class Connector(ABC):

	def __init__(self, storage: TransactionalStorageSPI):
		self.storage = storage
		self.snowflakeGenerator = ask_snowflake_generator()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.task_service = get_task_service(self.storage)

	# noinspection PyMethodMayBeStatic
	def ask_lock(self, lock: CollectorCompetitiveLock) -> bool:
		return self.competitive_lock_service.try_lock_nowait(lock)

	# noinspection PyMethodMayBeStatic
	def ask_unlock(self, lock: CollectorCompetitiveLock) -> bool:
		return self.competitive_lock_service.unlock(lock)

	def get_resource_lock(self, resource_id: str, tenant_id: str) -> CollectorCompetitiveLock:
		return CollectorCompetitiveLock(
			lockId=self.snowflakeGenerator.next_id(),
			resourceId=resource_id,
			registeredAt=get_current_time_in_seconds(),
			tenantId=tenant_id,
			status=0)

	def create_task(self, task: CollectorTask) -> CollectorTask:
		return self.task_service.create_task(task)

	def process_task(self, task: CollectorTask, executed: Callable[[str, Dict, str], None]) -> ResultStatus:
		return self.task_service.consume_task(task, executed)

	def find_task_by_id(self, task_id: CollectorTaskId) -> CollectorTask:
		try:
			self.storage.connect()
			return self.task_service.find_task_by_id(task_id)
		finally:
			self.storage.close()

	def task_result(self, task: CollectorTask, status: int, result: str):
		try:
			self.storage.connect()
			self.task_service.update_task_result(task, status, result)
		finally:
			self.storage.close()

	def already_created_task(self, resource_id: str) -> bool:
		try:
			self.storage.connect()
			return self.task_service.count_task_by_resource_id(resource_id) == 1
		finally:
			self.storage.close()

	def fill_task_dependency(self, dependencies: List[Dependency]):
		try:
			self.storage.connect()
			return self.task_service.fill_dependent_tasks(dependencies)
		finally:
			self.storage.close()

	def get_collector_task(self, resource_id: str, content: Dict, model_name: str, object_id: str, dependencies: List,
	                       tenant_id: str):
		return CollectorTask(
			taskId=self.snowflakeGenerator.next_id(),
			resourceId=resource_id,
			content=content,
			modelName=model_name,
			objectId=object_id,
			dependencies=dependencies,
			tenantId=tenant_id,
			status=0
		)

	def task_listener(self) -> None:
		task_ids_list = self.task_service.find_suspended_and_initial_task_ids()
		for task_ids in task_ids_list:
			# noinspection PyUnresolvedReferences
			lock = self.get_resource_lock(task_ids.resourceId, task_ids.tenantId)
			try:
				if self.ask_lock(lock):
					# noinspection PyUnresolvedReferences
					task = self.find_task_by_id(task_ids.taskId)
					if self.fill_task_dependency(task.dependencies):
						self.process_task(task, pipeline_data)
						break
			finally:
				self.ask_unlock(lock)
