from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import IntegratedRecord
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, IntegratedRecordId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, \
	EntityList, EntitySortColumn, EntitySortMethod, EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaOperator, \
	SnowflakeGenerator


class IntegratedRecordShaper(EntityShaper):

	def serialize(self, entity: IntegratedRecord) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'integrated_record_id': entity.integratedRecordId,
			'resource_id': entity.resourceId,
			'data_content': entity.dataContent,
			'model_name': entity.modelName,
			'object_id': entity.objectId,
			'dependency': entity.dependencies,
			'need_merge_json': entity.needMergeJson,
			'root_node': entity.rootNode
		})

	def deserialize(self, row: EntityRow) -> IntegratedRecord:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, IntegratedRecord(
			integratedRecordId=row.get('integrated_record_id'),
			resourceId=row.get('resource_id'),
			dataContent=row.get('data_content'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			dependencies=row.get('dependency'),
			needMergeJson=row.get('need_merge_json'),
			rootNode=row.get('root_node')
		))


INTEGRATED_RECORD_TABLE = 'integrated_record'
INTEGRATED_RECORD_ENTITY_SHAPER = IntegratedRecordShaper()


class IntegratedRecordService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return INTEGRATED_RECORD_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return INTEGRATED_RECORD_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'integrated_record_id'

	def get_storable_id(self, storable: IntegratedRecord) -> StorableId:
		return storable.integratedRecordId

	def set_storable_id(
			self, storable: IntegratedRecord, storable_id: IntegratedRecordId) -> Storable:
		storable.integratedRecordId = storable_id
		return storable

	def create_integrated_record(self, record: IntegratedRecord) -> IntegratedRecord:
		self.begin_transaction()
		try:
			record = self.create(record)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return record
		except Exception as e:
			self.rollback_transaction()
			raise e

	def update_integrated_record(self, record: IntegratedRecord) -> IntegratedRecord:
		self.begin_transaction()
		try:
			record = self.update(record)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return record
		except Exception as e:
			self.rollback_transaction()
			raise e

	def find_by_record_id(self, record_id: IntegratedRecordId) -> Optional[IntegratedRecord]:
		self.begin_transaction()
		try:
			return self.find_by_id(record_id)
		finally:
			self.close_transaction()

	def find_distinct_values(self) -> EntityList:
		return self.storage.find_distinct_values(self.get_entity_finder_for_columns(
			criteria=[],
			distinctColumnNames=['integrated_record_id', 'resource_id', 'tenant_id'],
			distinctValueOnSingleColumn=False,
			sort=[EntitySortColumn(name='resource_id', method=EntitySortMethod.ASC)]
		))

	def find_data_dependency(self, resource_id: str, model_name: str, object_id: str) -> int:
		return self.storage.count(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='resource_id'),
				operator=EntityCriteriaOperator.LESS_THAN, right=resource_id),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='model_name'),
				operator=EntityCriteriaOperator.EQUALS, right=model_name),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='object_id'),
				operator=EntityCriteriaOperator.EQUALS, right=object_id),
		]))


def get_integrated_record_service(storage: TransactionalStorageSPI,
                                  snowflake_generator: SnowflakeGenerator,
                                  principal_service: PrincipalService
                                  ) -> IntegratedRecordService:
	return IntegratedRecordService(storage, snowflake_generator, principal_service)
