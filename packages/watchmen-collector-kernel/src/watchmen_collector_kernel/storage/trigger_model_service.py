from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.common import IS_FINISHED, TENANT_ID
from watchmen_collector_kernel.model import TriggerModel
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ModelTriggerId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral


class TriggerModelShaper(EntityShaper):

	def serialize(self, entity: TriggerModel) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'model_trigger_id': entity.modelTriggerId,
			'model_name': entity.modelName,
			'priority': entity.priority,
			'is_finished': entity.isFinished,
			'module_trigger_id': entity.moduleTriggerId,
			'event_trigger_id': entity.eventTriggerId
		})

	def deserialize(self, row: EntityRow) -> TriggerModel:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerModel(
			modelTriggerId=row.get('model_trigger_id'),
			modelName=row.get('model_name'),
			priority=row.get('priority'),
			isFinished=row.get('is_finished'),
			moduleTriggerId=row.get('module_trigger_id'),
			eventTriggerId=row.get('event_trigger_id')
		))


TRIGGER_MODEL_TABLE = 'trigger_model'
TRIGGER_MODEL_ENTITY_SHAPER = TriggerModelShaper()


class TriggerModelService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return TRIGGER_MODEL_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return TRIGGER_MODEL_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'model_trigger_id'

	def get_storable_id(self, storable: TriggerModel) -> StorableId:
		# noinspection PyTypeChecker
		return storable.modelTriggerId

	def set_storable_id(
			self, storable: TriggerModel, storable_id: ModelTriggerId) -> Storable:
		storable.modelTriggerId = storable_id
		return storable

	def find_trigger_by_id(self, trigger_id: int) -> Optional[TriggerModel]:
		self.begin_transaction()
		try:
			return self.find_by_id(trigger_id)
		finally:
			self.close_transaction()

	def is_finished(self, event_trigger_id: str) -> bool:
		self.begin_transaction()
		try:
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_FINISHED), right=False),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'), right=event_trigger_id)
				]
			)) == 0
		finally:
			self.close_transaction()

	def find_by_event_trigger_id(self, event_trigger_id: int) -> List[TriggerModel]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'), right=event_trigger_id)
				]
			))
		finally:
			self.close_transaction()

	def find_by_module_trigger_id(self, module_trigger_id: int) -> List[TriggerModel]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='module_trigger_id'), right=module_trigger_id)
				]
			))
		finally:
			self.close_transaction()

def get_trigger_model_service(storage: TransactionalStorageSPI,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService
                              ) -> TriggerModelService:
	return TriggerModelService(storage, snowflake_generator, principal_service)
