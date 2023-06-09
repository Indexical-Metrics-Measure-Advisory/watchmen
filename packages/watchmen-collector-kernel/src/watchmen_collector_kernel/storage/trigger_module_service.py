from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.common import IS_FINISHED, TENANT_ID
from watchmen_collector_kernel.model import TriggerModule
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ModelTriggerId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral


class TriggerModuleShaper(EntityShaper):

	def serialize(self, entity: TriggerModule) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'module_trigger_id': entity.moduleTriggerId,
			'module_name': entity.moduleName,
			'priority': entity.priority,
			'is_finished': entity.isFinished,
			'event_trigger_id': entity.eventTriggerId
		})

	def deserialize(self, row: EntityRow) -> TriggerModule:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerModule(
			moduleTriggerId=row.get('module_trigger_id'),
			moduleName=row.get('module_name'),
			priority=row.get('priority'),
			isFinished=row.get('is_finished'),
			eventTriggerId=row.get('event_trigger_id')
		))


TRIGGER_MODULE_TABLE = 'trigger_module'
TRIGGER_MODULE_ENTITY_SHAPER = TriggerModuleShaper()


class TriggerModuleService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return TRIGGER_MODULE_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return TRIGGER_MODULE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'module_trigger_id'

	def get_storable_id(self, storable: TriggerModule) -> StorableId:
		# noinspection PyTypeChecker
		return storable.moduleTriggerId

	def set_storable_id(
			self, storable: TriggerModule, storable_id: ModelTriggerId) -> Storable:
		storable.moduleTriggerId = storable_id
		return storable

	def find_trigger_by_id(self, trigger_id: int) -> Optional[TriggerModule]:
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
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'),
					                         right=event_trigger_id)
				]
			)) == 0
		finally:
			self.close_transaction()

	def find_by_event_trigger_id(self, event_trigger_id: int) -> List[TriggerModule]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'),
					                         right=event_trigger_id)
				]
			))
		finally:
			self.close_transaction()


def get_trigger_module_service(storage: TransactionalStorageSPI,
                               snowflake_generator: SnowflakeGenerator,
                               principal_service: PrincipalService
                               ) -> TriggerModuleService:
	return TriggerModuleService(storage, snowflake_generator, principal_service)
