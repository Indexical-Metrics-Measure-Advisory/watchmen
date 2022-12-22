from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.admin import UserRole
from watchmen_model.common import EventDefinitionId, Storable, TenantId, Tuple
from watchmen_model.webhook.event_defination import EventDefinition
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityHelper, \
	EntityIdHelper, EntityName, EntityRow, EntityShaper


class EventDefinitionShaper(EntityShaper):
	def serialize(self, event_definition: EventDefinition) -> EntityRow:
		return TupleShaper.serialize(event_definition, {
			'event_definition_id': event_definition.eventDefinitionId,
			'event_code': event_definition.eventCode,
			'event_name': event_definition.eventName,
			'event_type': event_definition.eventType,
			'event_source': event_definition.eventSource,
			'role': event_definition.role
		})

	def deserialize(self, row: EntityRow) -> Tuple:
		return TupleShaper.deserialize(row, EventDefinition(
			eventDefinitionId=row.get('event_definition_id'),
			eventCode=row.get('event_code'),
			eventName=row.get('event_name'),
			eventType=row.get('event_type'),
			eventSource=row.get('event_source'),
			role=row.get('role')
		))


EVENT_DEFINITION_ENTITY_NAME = 'event_definitions'
EVENT_DEFINITION_ENTITY_SHAPER = EventDefinitionShaper()


class EventDefinitionService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_storable_id_column_name(self) -> EntityName:
		return "event_definition_id"

	def get_storable_id(self, storable: EventDefinition) -> StorableId:
		return storable.eventDefinitionId

	def set_storable_id(self, storable: EventDefinition, storable_id: StorableId) -> Storable:
		storable.eventDefinitionId = storable_id
		return storable

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return EVENT_DEFINITION_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return EVENT_DEFINITION_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def generate_event_definition_id(self) -> EventDefinitionId:
		return str(self.snowflakeGenerator.next_id())

	# noinspection PyMethodMayBeStatic
	def get_event_definition_id_column_name(self) -> str:
		return 'event_definition_id'

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(),
			idColumnName=self.get_event_definition_id_column_name())

	def find_by_user_role(self, user_role: UserRole, tenant_id: Optional[TenantId]) -> List[EventDefinition]:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='role'), operator=EntityCriteriaOperator.EQUALS,
				right=user_role)
		]

		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
