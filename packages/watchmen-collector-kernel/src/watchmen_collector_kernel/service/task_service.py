from logging import getLogger
from typing import Callable, Dict, Optional, List, Any

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask, TaskStatus
from watchmen_collector_kernel.storage import get_scheduled_task_service
from watchmen_storage import TransactionalStorageSPI, SnowflakeGenerator
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class TaskService:

	def __init__(self,
	             storage: TransactionalStorageSPI,
	             snowflake_generator: SnowflakeGenerator,
	             principal_service: PrincipalService
	             ):
		self.storage = storage
		self.snowflake_generator = snowflake_generator
		self.principal_service = principal_service
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)

	# noinspection PyMethodMayBeStatic
	def consume_task(self, task: ScheduledTask, executed: Callable[[str, Dict, str], None]) -> ScheduledTask:
		try:
			executed(task.topicCode, task.content, task.tenantId)
			task.status = int(TaskStatus.SUCCESS)
			return self.scheduled_task_service.update_task(task)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			task.status = int(TaskStatus.FAILED)
			task.result = repr(e)
			return self.scheduled_task_service.update_task(task)

	def is_dependencies_finished(self, dependence: Optional[List[int]]) -> bool:
		if ArrayHelper(dependence).some(self.is_dependent_task_unfinished):
			return False
		else:
			return True

	def is_dependent_task_unfinished(self, task_id: int) -> bool:
		existed_task = self.scheduled_task_service.find_task_by_id(task_id)
		return self.is_unfinished(existed_task)

	# noinspection PyMethodMayBeStatic
	def is_unfinished(self, task: ScheduledTask) -> bool:
		if task.status == TaskStatus.INITIAL:
			return True


def get_task_service(storage: TransactionalStorageSPI,
                     snowflake_generator: SnowflakeGenerator,
                     principal_service: PrincipalService) -> TaskService:
	return TaskService(storage, snowflake_generator, principal_service)
