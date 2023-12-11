import json
from logging import getLogger
from typing import Callable, Dict, Optional, List, Union

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_collector_kernel.model.scheduled_task import Dependence, TaskType
from watchmen_collector_kernel.storage import get_scheduled_task_service, get_scheduled_task_history_service
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
		self.scheduled_task_history_service = get_scheduled_task_history_service(self.storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)

	# noinspection PyMethodMayBeStatic
	def consume_task(self, task: ScheduledTask, executed: Union[Callable[[str, Dict, str], None],
	                                                            Callable[[str, Dict, str, str], None]]) -> None:
		if task.type == TaskType.DEFAULT.value:
			executed(task.topicCode, task.content, task.tenantId)
		elif task.type == TaskType.RUN_PIPELINE.value:
			executed(task.topicCode, task.content, task.tenantId, task.pipelineId)

	def update_task_result(self, task: ScheduledTask, status: int) -> ScheduledTask:
		try:
			self.scheduled_task_service.begin_transaction()
			task.isFinished = True
			task.status = status
			self.scheduled_task_history_service.create(task)
			self.scheduled_task_service.delete(task.taskId)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_service.close_transaction()

	def is_dependencies_finished(self, task: ScheduledTask) -> bool:
		return ArrayHelper(task.parentTaskId).every(self.is_parent_task_finished) and self.is_dependence_finished(
			task.dependOn, task.tenantId)

	def is_parent_task_finished(self, task_id: ScheduledTaskId) -> bool:
		existed_task = self.scheduled_task_service.find_task_by_id(task_id)
		if existed_task:
			return self.is_finished(existed_task)
		else:
			return True

	# noinspection PyMethodMayBeStatic
	def is_finished(self, task: ScheduledTask) -> bool:
		return task.isFinished

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


# for collector prepare
def save_json_to_local(topic_name: str, content: Dict):
	file_path = f'{topic_name}.json'
	with open(file_path, 'w') as f:
		json.dump([content], f)
