from logging import getLogger
from traceback import format_exc
from typing import Callable, Dict, Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_collector_kernel.model.scheduled_task import Dependence
from watchmen_collector_kernel.storage import get_scheduled_task_service
from watchmen_model.common import ScheduledTaskId
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
			task.isFinished = True
			return self.scheduled_task_service.update_task(task)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			task.isFinished = True
			task.result = format_exc()
			return self.scheduled_task_service.update_task(task)

	def is_dependencies_finished(self, task: ScheduledTask) -> bool:
		return ArrayHelper(task.parentTaskId).every(self.is_parent_task_finished) \
		       and self.is_dependence_finished(task.dependOn, task.tenantId)

	def is_parent_task_finished(self, task_id: ScheduledTaskId) -> bool:
		existed_task = self.scheduled_task_service.find_task_by_id(task_id)
		return self.is_finished(existed_task)

	# noinspection PyMethodMayBeStatic
	def is_finished(self, task: ScheduledTask) -> bool:
		if task.status == TaskStatus.SUCCESS or task.status == TaskStatus.FAILED:
			return True
		else:
			return False

	def is_dependence_finished(self, depend_on: Optional[List[Dependence]], tenant_id: str) -> bool:
		if ArrayHelper(depend_on).every(lambda dependence: self.is_dependent_task_finished(dependence, tenant_id)):
			return True
		else:
			return False

	def is_dependent_task_finished(self, dependence: Dependence, tenant_id: str) -> bool:
		return self.scheduled_task_service.is_dependent_task_finished(dependence.modelName,
		                                                              dependence.objectId,
		                                                              tenant_id)


def get_task_service(storage: TransactionalStorageSPI,
                     snowflake_generator: SnowflakeGenerator,
                     principal_service: PrincipalService) -> TaskService:
	return TaskService(storage, snowflake_generator, principal_service)
