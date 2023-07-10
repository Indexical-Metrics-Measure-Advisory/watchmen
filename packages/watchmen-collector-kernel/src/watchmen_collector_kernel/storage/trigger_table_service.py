from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerTable
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, TableTriggerId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaJoint, EntityCriteriaExpression, ColumnNameLiteral, EntitySortColumn


class TriggerTableShaper(EntityShaper):

	def serialize(self, entity: TriggerTable) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'table_trigger_id': entity.tableTriggerId,
			'table_name': entity.tableName,
			'model_name': entity.modelName,
			'is_extracted': entity.isExtracted,
			'data_count': entity.dataCount,
			'model_trigger_id': entity.modelTriggerId,
			'module_trigger_id': entity.moduleTriggerId,
			'event_trigger_id': entity.eventTriggerId
		})

	def deserialize(self, row: EntityRow) -> TriggerTable:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerTable(
			tableTriggerId=row.get('table_trigger_id'),
			tableName=row.get('table_name'),
			modelName=row.get('model_name'),
			isExtracted=row.get('is_extracted'),
			dataCount=row.get('data_count'),
			modelTriggerId=row.get('model_trigger_id'),
			moduleTriggerId=row.get('module_trigger_id'),
			eventTriggerId=row.get('event_trigger_id')
		))


TRIGGER_TABLE_TABLE = 'trigger_table'
TRIGGER_TABLE_ENTITY_SHAPER = TriggerTableShaper()


class TriggerTableService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return TRIGGER_TABLE_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return TRIGGER_TABLE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'table_trigger_id'

	def get_storable_id(self, storable: TriggerTable) -> StorableId:
		# noinspection PyTypeChecker
		return storable.tableTriggerId

	def set_storable_id(
			self, storable: TriggerTable, storable_id: TableTriggerId) -> Storable:
		storable.tableTriggerId = storable_id
		return storable

	def update_table_trigger(self, trigger: TriggerTable):
		self.begin_transaction()
		try:
			result = self.update(trigger)
			self.commit_transaction()
			return result
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def find_unfinished(self) -> Optional[List[TriggerTable]]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find_distinct_values(
				self.get_entity_finder_for_columns(
					criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_extracted'), right=False)],
					distinctColumnNames=['table_trigger_id',
					                     'tenant_id'],
					distinctValueOnSingleColumn=False)
			)
		finally:
			self.close_transaction()

	def find_by_id(self, trigger_id: TableTriggerId) -> Optional[TriggerTable]:
		self.begin_transaction()
		try:
			return self.storage.find_by_id(trigger_id, self.get_entity_id_helper())
		finally:
			self.close_transaction()

	def find_by_model_trigger_id(self, model_trigger_id: int) -> List[TriggerTable]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_trigger_id'), right=model_trigger_id)
				]
			))
		finally:
			self.close_transaction()


def get_trigger_table_service(storage: TransactionalStorageSPI,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService
                              ) -> TriggerTableService:
	return TriggerTableService(storage, snowflake_generator, principal_service)
