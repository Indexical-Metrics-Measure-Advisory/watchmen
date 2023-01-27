from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorIntegratedRecord
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, CollectorIntegratedRecordId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, \
	EntityList, EntitySortColumn, EntitySortMethod, EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaOperator, \
	SnowflakeGenerator


class CollectorIntegratedRecordShaper(EntityShaper):

	def serialize(self, entity: CollectorIntegratedRecord) -> EntityRow:
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

	def deserialize(self, row: EntityRow) -> CollectorIntegratedRecord:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorIntegratedRecord(
			integratedRecordId=row.get('integrated_record_id'),
			resourceId=row.get('resource_id'),
			dataContent=row.get('data_content'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			dependencies=row.get('dependency'),
			needMergeJson=row.get('need_merge_json'),
			rootNode=row.get('root_node')
		))


COLLECTOR_INTEGRATED_RECORDS_TABLE = 'collector_integrated_records'
COLLECTOR_INTEGRATED_RECORDS_ENTITY_SHAPER = CollectorIntegratedRecordShaper()


class CollectorIntegratedRecordService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_INTEGRATED_RECORDS_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_INTEGRATED_RECORDS_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'integrated_record_id'

	def get_storable_id(self, storable: CollectorIntegratedRecord) -> StorableId:
		return storable.integratedRecordId

	def set_storable_id(
			self, storable: CollectorIntegratedRecord, storable_id: CollectorIntegratedRecordId) -> Storable:
		storable.integratedRecordId = storable_id
		return storable

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


def get_collector_integrated_record_service(storage: TransactionalStorageSPI,
                                            snowflake_generator: SnowflakeGenerator,
                                            principal_service: PrincipalService
) -> CollectorIntegratedRecordService:
	return CollectorIntegratedRecordService(storage, snowflake_generator, principal_service)
