from logging import getLogger
from traceback import format_exc
from typing import Callable, Dict, Optional, List

from watchmen_collector_kernel.model import CollectorTask, ResultStatus, Dependency, TaskStatus
from watchmen_collector_kernel.service import get_collector_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin
from watchmen_model.common import CollectorTaskId
from watchmen_storage import TransactionalStorageSPI, EntityList

logger = getLogger(__name__)


class TaskService:

	def __init__(self, storage: TransactionalStorageSPI):
		self.storage = storage
		self.snowflakeGenerator = ask_snowflake_generator()
		self.collector_task_service = get_collector_task_service(self.storage, self.snowflakeGenerator, ask_super_admin())

	# noinspection PyTypeChecker
	def create_task(self, task: CollectorTask) -> CollectorTask:
		return self.collector_task_service.create(task)

	# noinspection PyMethodMayBeStatic
	def consume_task(self, task: CollectorTask, executed: Callable[[str, Dict, str], None]) -> ResultStatus:
		try:
			executed(task.modelName, task.content, task.tenantId)
			self.update_task_result(task, int(TaskStatus.SUCCESS), ResultStatus.COMPLETED_TASK)
			return ResultStatus.COMPLETED_TASK
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			self.update_task_result(task, int(TaskStatus.FAILED), format_exc())
			return ResultStatus.PROCESS_TASK_FAILED

	def find_task_by_id(self, task_id: CollectorTaskId) -> CollectorTask:
		# noinspection PyTypeChecker
		return self.collector_task_service.find_by_id(task_id)

	def update_task_result(self, task: CollectorTask, status: int, result: str):
		try:
			self.storage.connect()
			self.collector_task_service.update_result_by_task_id(task.taskId, status, result)
		finally:
			self.storage.close()

	def fill_dependent_tasks(self, dependencies: Optional[List[Dependency]]) -> bool:
		if dependencies is None:
			return True

		for dependency in dependencies:
			# noinspection PyUnresolvedReferences
			result = self.collector_task_service.find_by_dependency(dependency.modelName, dependency.objectId)
			if result != 0:
				return False
		return True

	def count_task_by_resource_id(self, resource_id: str) -> int:
		return self.collector_task_service.count_by_resource_id(resource_id)

	def find_suspended_and_initial_task_ids(self) -> EntityList:
		try:
			self.storage.connect()
			return self.collector_task_service.find_all_not_complete_task_ids()
		finally:
			self.storage.close()


def get_task_service(storage: TransactionalStorageSPI) -> TaskService:
	return TaskService(storage)

