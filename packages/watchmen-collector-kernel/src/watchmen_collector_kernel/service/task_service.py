from logging import getLogger
from traceback import format_exc
from typing import Callable, Dict, Optional, List, Any

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask, ResultStatus, TaskStatus
from watchmen_collector_kernel.model.scheduled_task import Dependence
from watchmen_collector_kernel.storage import get_scheduled_task_service
from watchmen_model.common import ScheduledTaskId
from watchmen_storage import TransactionalStorageSPI, EntityList, SnowflakeGenerator
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
			executed(task.modelName, task.content, task.tenantId)
			task.status = int(TaskStatus.SUCCESS)
			task.result = ResultStatus.COMPLETED_TASK
			return self.scheduled_task_service.update_task(task)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			task.status = int(TaskStatus.FAILED)
			task.result = format_exc()
			return self.scheduled_task_service.update_task(task)

	def check_dependencies(self, dependencies: Optional[List[Dependence]]) -> bool:
		if dependencies is None:
			return True
		ArrayHelper(dependencies).some(self.check_dependent_tasks)

	def check_dependent_tasks(self, dependence: Dependence) -> bool:
		existed_tasks = self.scheduled_task_service.find_by_dependence(dependence)
		return ArrayHelper(existed_tasks).some(self.is_unfinished)

	# noinspection PyMethodMayBeStatic
	def is_unfinished(self, task: Dict[str, Any]) -> bool:
		if task.get('status') == TaskStatus.INITIAL:
			return True
		if task.get('status') == TaskStatus.SUSPEND:
			return True


def get_task_service(storage: TransactionalStorageSPI,
                     snowflake_generator: SnowflakeGenerator,
                     principal_service: PrincipalService) -> TaskService:
	return TaskService(storage, snowflake_generator, principal_service)
