from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ChangeDataRecord
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ChangeRecordId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral


class ChangeDataRecordShaper(EntityShaper):
	def serialize(self, entity: ChangeDataRecord) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity,
		                                          {
			                                          'change_record_id': entity.changeRecordId,
			                                          'model_name': entity.modelName,
			                                          'table_name': entity.tableName,
			                                          'data_id': entity.dataId,
			                                          'root_table_name': entity.rootTableName,
			                                          'root_data_id': entity.rootDataId,
			                                          'is_merged': entity.isMerged,
			                                          'table_trigger_id': entity.tableTriggerId,
			                                          'model_trigger_id': entity.modelTriggerId,
			                                          'event_trigger_id': entity.eventTriggerId
		                                          })

	def deserialize(self, row: EntityRow) -> ChangeDataRecord:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row,
		                                            ChangeDataRecord(
			                                            changeRecordId=row.get('change_record_id'),
			                                            modelName=row.get('model_name'),
			                                            tableName=row.get('table_name'),
			                                            dataId=row.get('data_id'),
			                                            rootTableName=row.get('root_table_name'),
			                                            rootDataId=row.get('root_data_id'),
			                                            isMerged=row.get('is_merged'),
			                                            tableTriggerId=row.get('table_trigger_id'),
			                                            modelTriggerId=row.get('model_trigger_id'),
			                                            eventTriggerId=row.get('event_trigger_id')
		                                            ))


CHANGE_DATA_RECORD_TABLE = 'change_data_record'
CHANGE_DATA_RECORD_ENTITY_SHAPER = ChangeDataRecordShaper()


class ChangeDataRecordService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return CHANGE_DATA_RECORD_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return CHANGE_DATA_RECORD_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'change_record_id'

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: ChangeDataRecord) -> StorableId:
		return storable.changeRecordId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: ChangeDataRecord, storable_id: ChangeRecordId) -> Storable:
		storable.changeRecordId = storable_id
		return storable

	def create_change_record(self, record: ChangeDataRecord) -> None:
		self.begin_transaction()
		try:
			self.create(record)
			self.commit_transaction()
		except Exception as e:
			self.rollback_transaction()
			raise e

	def update_change_record(self, record: ChangeDataRecord) -> Optional[List[ChangeDataRecord]]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			self.update(record)
			self.commit_transaction()
		except Exception as e:
			self.rollback_transaction()
			raise e

	def find_unmerged_records(self) -> List:
		self.begin_transaction()
		try:
			return self.storage.find_distinct_values(self.get_entity_finder_for_columns(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_merged'), right=False)
				],
				distinctColumnNames=['change_record_id', 'tenant_id'],
				distinctValueOnSingleColumn=False
			))
		finally:
			self.close_transaction()

	def count_unmerged_records(self) -> int:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_merged'), right=False)
				]
			))
		finally:
			self.close_transaction()

	def find_change_record_by_id(self, change_record_id: ChangeRecordId) -> ChangeDataRecord:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.find_by_id(change_record_id)
		finally:
			self.close_transaction()

	def find_existed_records(self, table_trigger_id: str) -> List[ChangeDataRecord]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find_distinct_values((self.get_entity_finder_for_columns(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='table_trigger_id'), right=table_trigger_id),
				],
				distinctColumnNames=['change_record_id', 'data_id', 'tenant_id'],
				distinctValueOnSingleColumn=False
			)))
		finally:
			self.close_transaction()


def get_change_data_record_service(storage: TransactionalStorageSPI,
                                   snowflake_generator: SnowflakeGenerator,
                                   principal_service: PrincipalService
                                   ) -> ChangeDataRecordService:
	return ChangeDataRecordService(storage, snowflake_generator, principal_service)