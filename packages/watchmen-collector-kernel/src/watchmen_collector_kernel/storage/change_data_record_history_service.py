from .change_data_record_service import ChangeDataRecordShaper, ChangeDataRecordService
from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ChangeDataRecordHistory
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ChangeRecordId
from watchmen_storage import EntityName, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class ChangeDataRecordHistoryShaper(ChangeDataRecordShaper):
	pass


CHANGE_DATA_RECORD_HISTORY_TABLE = 'change_data_record_history'
CHANGE_DATA_RECORD_HISTORY_ENTITY_SHAPER = ChangeDataRecordHistoryShaper()


class ChangeDataRecordHistoryService(ChangeDataRecordService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return CHANGE_DATA_RECORD_HISTORY_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return CHANGE_DATA_RECORD_HISTORY_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'change_record_id'

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: ChangeDataRecordHistory) -> StorableId:
		# noinspection PyTypeChecker
		return storable.changeRecordId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: ChangeDataRecordHistory, storable_id: ChangeRecordId) -> Storable:
		storable.changeRecordId = storable_id
		return storable


def get_change_data_record_history_service(storage: TransactionalStorageSPI,
                                           snowflake_generator: SnowflakeGenerator,
                                           principal_service: PrincipalService
                                           ) -> ChangeDataRecordService:
	return ChangeDataRecordHistoryService(storage, snowflake_generator, principal_service)
