from datetime import datetime
from typing import List, Optional, Dict

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.common import CHANGE_RECORD_ID, TENANT_ID, IS_MERGED, ask_partial_size, STATUS
from watchmen_collector_kernel.model import ChangeDataRecord
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ChangeRecordId, Pageable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral, EntityStraightValuesFinder, EntityStraightColumn, EntityColumnType, \
	EntityPager, EntityLimitedFinder, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper


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
			                                          'status': entity.status,
			                                          'result': entity.result,
			                                          'table_trigger_id': entity.tableTriggerId,
			                                          'model_trigger_id': entity.modelTriggerId,
			                                          'module_trigger_id': entity.moduleTriggerId,
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
			                                            status=row.get('status'),
			                                            result=row.get('result'),
			                                            tableTriggerId=row.get('table_trigger_id'),
			                                            modelTriggerId=row.get('model_trigger_id'),
			                                            moduleTriggerId=row.get('module_trigger_id'),
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
		# noinspection PyTypeChecker
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
		finally:
			self.close_transaction()

	def update_change_record(self, record: ChangeDataRecord) -> Optional[ChangeDataRecord]:
		self.begin_transaction()
		try:
			result = self.update(record)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return result
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def find_unmerged_records(self) -> List:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				shaper=self.get_entity_shaper(),
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_MERGED), right=False)
				],
				straightColumns=[EntityStraightColumn(columnName=CHANGE_RECORD_ID),
				                 EntityStraightColumn(columnName=TENANT_ID)]
			))
		finally:
			self.close_transaction()

	def find_partial_records(self) -> List[ChangeDataRecord]:
		self.begin_transaction()
		try:
			return self.storage.page(self.get_entity_pager(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_MERGED), right=False)
				],
				pageable=Pageable(pageNumber=1, pageSize=ask_partial_size())
			)).data
		finally:
			self.close_transaction()

	def find_records_and_locked(self, limit: int = None) -> List:
		return self.storage.find_for_update_skip_locked(
			EntityLimitedFinder(
				name=self.get_entity_name(),
				shaper=self.get_entity_shaper(),
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=STATUS), right=0)
				],
				limit=limit if limit is not None else ask_partial_size()
			))

	def is_existed(self, change_record: ChangeDataRecord) -> bool:
		self.begin_transaction()
		try:
			return self.storage.exists(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(
							columnName=self.get_storable_id_column_name()
						),
						right=change_record.changeRecordId)
				]
			))
		finally:
			self.close_transaction()

	def find_change_record_by_id(self, change_record_id: ChangeRecordId) -> Optional[ChangeDataRecord]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.find_by_id(change_record_id)
		finally:
			self.close_transaction()

	def find_existed_records(self, table_trigger_id: int) -> List[Dict]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			result = self.storage.find_straight_values(
				EntityStraightValuesFinder(
					name=self.get_entity_name(),
					shaper=self.get_entity_shaper(),
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='table_trigger_id'),
						                         right=table_trigger_id)
					],
					straightColumns=[EntityStraightColumn(columnName='data_id', columnType=EntityColumnType.JSON)]
				)
			)
			return ArrayHelper(result).map(lambda x: x.get('data_id')).to_list()
		finally:
			self.close_transaction()

	def is_event_finished(self, event_trigger_id: int) -> bool:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'),
					                         right=event_trigger_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_MERGED), right=False)
				]
			)) == 0
		finally:
			self.close_transaction()

	def is_model_finished(self, model_trigger_id: int) -> bool:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_trigger_id'),
					                         right=model_trigger_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_MERGED), right=False)
				]
			)) == 0
		finally:
			self.close_transaction()

	def is_module_finished(self, module_trigger_id: int) -> bool:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='module_trigger_id'),
					                         right=module_trigger_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_MERGED), right=False)
				]
			)) == 0
		finally:
			self.close_transaction()

	def count_change_data_record(self, event_trigger_id: int) -> int:
		return self.storage.count(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'),
				                         right=event_trigger_id)
			]
		))

	def find_timeout_record(self, query_time: datetime) -> List:
		try:
			self.storage.connect()
			return self.storage.find(self.get_entity_finder(criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='last_modified_at'),
					operator=EntityCriteriaOperator.LESS_THAN, right=query_time),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=1)
			]))
		finally:
			self.storage.close()


def get_change_data_record_service(storage: TransactionalStorageSPI,
                                   snowflake_generator: SnowflakeGenerator,
                                   principal_service: PrincipalService
                                   ) -> ChangeDataRecordService:
	return ChangeDataRecordService(storage, snowflake_generator, principal_service)
