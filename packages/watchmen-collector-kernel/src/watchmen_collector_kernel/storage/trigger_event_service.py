from typing import List, Dict, Any

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, EventTriggerId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityStraightValuesFinder, EntityCriteriaExpression, ColumnNameLiteral, \
	EntityStraightColumn, EntitySortColumn, EntitySortMethod


class TriggerEventShaper(EntityShaper):

	def serialize(self, entity: TriggerEvent) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'event_trigger_id': entity.eventTriggerId,
			'start_time': entity.startTime,
			'end_time': entity.endTime,
			'is_finished': entity.isFinished
		})

	def deserialize(self, row: EntityRow) -> TriggerEvent:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerEvent(
			eventTriggerId=row.get('event_trigger_id'),
			startTime=row.get('start_time'),
			endTime=row.get('end_time'),
			isFinished=row.get('is_finished')
		))


TRIGGER_EVENT_TABLE = 'trigger_event'
TRIGGER_EVENT_ENTITY_SHAPER = TriggerEventShaper()


class TriggerEventService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return TRIGGER_EVENT_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return TRIGGER_EVENT_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'event_trigger_id'

	def get_storable_id(self, storable: TriggerEvent) -> StorableId:
		# noinspection PyTypeChecker
		return storable.eventTriggerId

	def set_storable_id(
			self, storable: TriggerEvent, storable_id: EventTriggerId) -> Storable:
		storable.eventTriggerId = storable_id
		return storable

	def find_event_by_id(self, event_trigger_id: EventTriggerId) -> TriggerEvent:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find_by_id(event_trigger_id, self.get_entity_id_helper())
		finally:
			self.storage.close()

	def find_unfinished_events(self) -> List[Dict[str, Any]]:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_finished'), right=False)],
				straightColumns=[EntityStraightColumn(columnName=self.get_storable_id_column_name()),
				                 EntityStraightColumn(columnName='tenant_id')],
				sort=[EntitySortColumn(name=self.get_storable_id_column_name(), method=EntitySortMethod.ASC)]
			))
		finally:
			self.close_transaction()


def get_trigger_event_service(storage: TransactionalStorageSPI,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService
                              ) -> TriggerEventService:
	return TriggerEventService(storage, snowflake_generator, principal_service)
