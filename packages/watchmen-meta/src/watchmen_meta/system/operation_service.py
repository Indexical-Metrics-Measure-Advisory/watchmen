from typing import TypeVar, Dict, Any, Optional

from watchmen_meta.common.storage_service import StorableId
from watchmen_meta.common import EntityService, TupleShaper, TupleService

from watchmen_model.common import Storable
from watchmen_model.system import Operation

from watchmen_storage import EntityName, EntityShaper, EntityRow, \
	EntityCriteriaExpression, ColumnNameLiteral, \
	EntityCriteriaOperator, EntityStraightValuesFinder, \
	EntityStraightColumn, EntityStraightAggregateColumn, EntityColumnAggregateArithmetic, EntityDeleter

RecordId = TypeVar('RecordId', bound=str)


class OperationShaper(EntityShaper):
	
	def serialize(self, operation: Operation) -> EntityRow:
		return TupleShaper.serialize_tenant_based(operation, {
			'record_id': operation.recordId,
			'tuple_type': operation.tupleType,
			'tuple_id': operation.tupleId,
			'content': operation.content,
			'version_num': operation.versionNum
		})
	
	def deserialize(self, row: EntityRow) -> Operation:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Operation(
			recordId=row.get('record_id'),
			tupleType=row.get('tuple_type'),
			tupleId=row.get('tuple_id'),
			content=row.get('content'),
			versionNum=row.get('version_num')
		))


OPERATIONS_TABLE = 'operations'
OPERATIONS_ENTITY_SHAPER = OperationShaper()


class RecordOperationService(TupleService):
	
	def get_entity_name(self) -> EntityName:
		return OPERATIONS_TABLE
	
	def get_entity_shaper(self) -> EntityShaper:
		return OPERATIONS_ENTITY_SHAPER
	
	def get_storable_id_column_name(self) -> EntityName:
		return 'record_id'
	
	def get_storable_id(self, storable: Operation) -> StorableId:
		return storable.recordId
	
	def set_storable_id(self, storable: Operation, storable_id: RecordId) -> Storable:
		storable.recordId = storable_id
		return storable
	
	def record_one(self, operation: Operation):
		self.create(operation)
	
	def build_operation(self, type_: str, id_: str, content: Dict, version) -> Operation:
		return Operation(
			**{"recordId": str(self.snowflakeGenerator.next_id()),
			   "tupleType": type_,
			   "tupleId": id_,
			   "content": content,
			   "versionNum": version,
			   "tenantId": self.principalService.tenantId}
		)

	def record_operation(self, entity_type: str, entity_id: str, entity: Any, service: EntityService, version: str):
		operation = self.build_operation(entity_type,
		                                 entity_id,
		                                 service.get_entity_shaper().serialize(entity),
		                                 version)
		self.record_one(operation)

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

	def get_operation_by_id(self, id_: str) -> Operation:
		operation = self.storage.find_by_id(id_, self.get_entity_id_helper())
		return operation

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
