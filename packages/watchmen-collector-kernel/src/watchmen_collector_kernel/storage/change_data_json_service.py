from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ChangeDataJson
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ChangeJsonId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	ColumnNameLiteral, EntityCriteriaExpression


class ChangeDataJsonShaper(EntityShaper):
	def serialize(self, entity: ChangeDataJson) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity,
		                                          {
			                                          'change_json_id': entity.changeJsonId,
			                                          'model_name': entity.modelName,
			                                          'object_id': entity.objectId,
			                                          'table_name': entity.tableName,
			                                          'data_id': entity.dataId,
			                                          'content': entity.content,
			                                          'depend_on': entity.dependOn,
			                                          'table_trigger_id': entity.tableTriggerId,
			                                          'model_trigger_id': entity.modelTriggerId,
			                                          'event_trigger_id': entity.eventTriggerId
		                                          })

	def deserialize(self, row: EntityRow) -> ChangeDataJson:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row,
		                                            ChangeDataJson(
			                                            changeJsonId=row.get('change_json_id'),
			                                            modelName=row.get('model_name'),
			                                            objectId=row.get('object_id'),
			                                            tableName=row.get('table_name'),
			                                            dataId=row.get('data_id'),
			                                            content=row.get('content'),
			                                            dependOn=row.get('depend_on'),
			                                            tableTriggerId=row.get('table_trigger_id'),
			                                            modelTriggerId=row.get('model_trigger_id'),
			                                            eventTriggerId=row.get('event_trigger_id')
		                                            ))


CHANGE_DATA_JSON_TABLE = 'change_data_json'
CHANGE_DATA_JSON_ENTITY_SHAPER = ChangeDataJsonShaper()


class ChangeDataJsonService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return CHANGE_DATA_JSON_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return CHANGE_DATA_JSON_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'change_json_id'

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: ChangeDataJson) -> StorableId:
		return storable.changeJsonId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: ChangeDataJson, storable_id: ChangeJsonId) -> Storable:
		storable.changeRecordId = storable_id
		return storable

	def find_change_json_by_resource_id(self, resource_id: str) -> Optional[ChangeDataJson]:
		try:
			self.storage.connect()
			return self.storage.find_one(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='resource_id'), right=resource_id)
				]
			))
		finally:
			self.storage.close()


def get_change_data_json_service(storage: TransactionalStorageSPI,
                                 snowflake_generator: SnowflakeGenerator,
                                 principal_service: PrincipalService
                                 ) -> ChangeDataJsonService:
	return ChangeDataJsonService(storage, snowflake_generator, principal_service)
