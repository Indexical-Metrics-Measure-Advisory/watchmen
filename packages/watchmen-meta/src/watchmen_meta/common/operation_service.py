from typing import TypeVar, Optional

from watchmen_auth import PrincipalService

from watchmen_meta.common.storage_service import StorableId
from watchmen_meta.common import EntityService

from watchmen_model.common import Storable
from watchmen_model.system import Operation

from watchmen_storage import EntityName, EntityShaper, EntityRow, \
	EntityCriteriaExpression, ColumnNameLiteral, \
	EntityCriteriaOperator, EntityStraightValuesFinder, \
	EntityStraightColumn, EntityStraightAggregateColumn, EntityColumnAggregateArithmetic, EntityDeleter, \
	SnowflakeGenerator, TransactionalStorageSPI

RecordId = TypeVar('RecordId', bound=str)


class OperationShaper(EntityShaper):
	
	def serialize(self, operation: Operation) -> EntityRow:
		return {
			'record_id': operation.recordId,
			'operation_type': operation.operationType,
			'tuple_type': operation.tupleType,
			'tuple_key': operation.tupleKey,
			'tuple_id': operation.tupleId,
			'content': operation.content,
			'version_num': operation.versionNum,
			'tenant_id': operation.tenantId,
			'created_at': operation.createdAt,
			'created_by': operation.createdBy,
			'last_modified_at': operation.lastModifiedAt,
			'last_modified_by': operation.lastModifiedBy
		}
	
	def deserialize(self, row: EntityRow) -> Operation:
		# noinspection PyTypeChecker
		return Operation(
			recordId=row.get('record_id'),
			operationType=row.get('operation_type'),
			tupleType=row.get('tuple_type'),
			tupleKey=row.get('tuple_key'),
			tupleId=row.get('tuple_id'),
			content=row.get('content'),
			versionNum=row.get('version_num'),
			tenantId=row.get('tenant_id'),
			createdAt=row.get('created_at'),
			createdBy=row.get('created_by'),
			lastModifiedAt=row.get('last_modified_at'),
			lastModifiedBy=row.get('last_modified_by')
		)


OPERATIONS_TABLE = 'operations'
OPERATIONS_ENTITY_SHAPER = OperationShaper()


class RecordOperationService(EntityService):

	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	def get_entity_name(self) -> EntityName:
		return OPERATIONS_TABLE
	
	def get_entity_shaper(self) -> EntityShaper:
		return OPERATIONS_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'record_id'

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: Operation) -> StorableId:
		return storable.recordId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: Operation, storable_id: RecordId) -> Storable:
		storable.recordId = storable_id
		return storable

	def record_operation(self, operation: Operation) -> None:
		self.try_to_prepare_auditable_on_create(operation)
		self.storage.insert_one(operation, self.get_entity_helper())

	def get_record_ids(self, version_num: str, tuple_type: str):
		return self.storage.find_straight_values(EntityStraightValuesFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tuple_type'), right=tuple_type),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='version_num'), right=version_num),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=self.principalService.tenantId)
			],
			straightColumns=[EntityStraightAggregateColumn(columnName="record_id",
			                                               arithmetic=EntityColumnAggregateArithmetic.MAX),
			                 EntityStraightColumn(columnName="tuple_id")]
		))

	def get_operation_by_id(self, id_: str) -> Optional[Operation]:
		return self.storage.find_by_id(id_, self.get_entity_id_helper())

	def get_previous_record_id(self, tuple_id: str, version: str) -> Optional[str]:
		rows = self.storage.find_straight_values(EntityStraightValuesFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tuple_id'),
				                         right=tuple_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
				                         right=self.principalService.tenantId),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='version_num'),
				                         operator=EntityCriteriaOperator.NOT_EQUALS,
				                         right=version),
			],
			straightColumns=[EntityStraightAggregateColumn(columnName="record_id",
			                                               arithmetic=EntityColumnAggregateArithmetic.MAX)]
		))
		return rows[0].get("record_id")
	
	def clean_operations(self, tuple_type: str) -> int:
		return self.storage.delete(EntityDeleter(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tuple_type'), right=tuple_type),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=self.principalService.tenantId)
			]
		))
