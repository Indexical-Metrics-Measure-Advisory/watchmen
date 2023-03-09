from .scheduled_task_service import ScheduledTaskShaper, ScheduledTaskService

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ScheduledTaskId
from watchmen_storage import EntityName, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class ScheduledTaskHistoryShaper(ScheduledTaskShaper):
	pass


SCHEDULED_TASK_HISTORY_TABLE = 'scheduled_task_history'
SCHEDULED_TASK_HISTORY_ENTITY_SHAPER = ScheduledTaskHistoryShaper()


class ScheduledTaskHistoryService(ScheduledTaskService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return SCHEDULED_TASK_HISTORY_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return SCHEDULED_TASK_HISTORY_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'task_id'

	def get_storable_id(self, storable: ScheduledTask) -> StorableId:
		return storable.taskId

	def set_storable_id(
			self, storable: ScheduledTask, storable_id: ScheduledTaskId) -> Storable:
		storable.taskId = storable_id
		return storable


def get_scheduled_task_history_service(storage: TransactionalStorageSPI,
                                       snowflake_generator: SnowflakeGenerator,
                                       principal_service: PrincipalService
                                       ) -> ScheduledTaskHistoryService:
	return ScheduledTaskHistoryService(storage, snowflake_generator, principal_service)
