from watchmen_collector_kernel.storage.change_data_json_service import ChangeDataJsonShaper, ChangeDataJsonService

from watchmen_auth import PrincipalService

from watchmen_collector_kernel.model import ChangeDataJson
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ChangeJsonId
from watchmen_storage import EntityName, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class ChangeDataJsonHistoryShaper(ChangeDataJsonShaper):
	pass


CHANGE_DATA_JSON_HISTORY_TABLE = 'change_data_json_history'
CHANGE_DATA_JSON_HISTORY_ENTITY_SHAPER = ChangeDataJsonHistoryShaper()


class ChangeDataJsonHistoryService(ChangeDataJsonService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return CHANGE_DATA_JSON_HISTORY_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return CHANGE_DATA_JSON_HISTORY_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'change_json_id'

	def get_storable_id(self, storable: ChangeDataJson) -> StorableId:
		# noinspection PyTypeChecker
		return storable.changeJsonId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: ChangeDataJson, storable_id: ChangeJsonId) -> Storable:
		storable.changeRecordId = storable_id
		return storable


def get_change_data_json_history_service(storage: TransactionalStorageSPI,
                                         snowflake_generator: SnowflakeGenerator,
                                         principal_service: PrincipalService
                                         ) -> ChangeDataJsonHistoryService:
	return ChangeDataJsonHistoryService(storage, snowflake_generator, principal_service)
