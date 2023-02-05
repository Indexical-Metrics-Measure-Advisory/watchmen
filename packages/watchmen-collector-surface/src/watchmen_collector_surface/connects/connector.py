from abc import ABC
from typing import Dict, List, Callable


from watchmen_collector_kernel.model import CompetitiveLock, ScheduledTask, Dependency, ResultStatus
from watchmen_collector_kernel.service import try_lock_nowait, unlock, get_task_service
from watchmen_collector_kernel.storage import get_competitive_lock_service
from watchmen_model.common import ScheduledTaskId
from .handler import pipeline_data
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin
from watchmen_storage import TransactionalStorageSPI


class Connector(ABC):

	def __init__(self, storage: TransactionalStorageSPI):
		self.storage = storage
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.task_service = get_task_service(self.storage, self.snowflake_generator, self.principle_service)

	# noinspection PyMethodMayBeStatic
	def ask_lock(self, lock: CompetitiveLock) -> bool:
		return try_lock_nowait(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def ask_unlock(self, lock: CompetitiveLock) -> bool:
		return unlock(self.competitive_lock_service, lock)

	def create_task(self, task: ScheduledTask) -> ScheduledTask:
		return self.task_service.create_task(task)

	def process_task(self, task: ScheduledTask, executed: Callable[[str, Dict, str], None]) -> ResultStatus:
		return self.task_service.consume_task(task, executed)

	def find_task_by_id(self, task_id: ScheduledTaskId) -> ScheduledTask:
		try:
			self.storage.connect()
			return self.task_service.find_task_by_id(task_id)
		finally:
			self.storage.close()

	def task_result(self, task: ScheduledTask, status: int, result: str):
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
		return ScheduledTask(
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
