from typing import List, Dict, Any, Optional

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
			'is_finished': entity.isFinished,
			'status': entity.status,
			'type': entity.type,
			'table_name': entity.tableName,
			'records': entity.records
		})

	def deserialize(self, row: EntityRow) -> TriggerEvent:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerEvent(
			eventTriggerId=row.get('event_trigger_id'),
			startTime=row.get('start_time'),
			endTime=row.get('end_time'),
			isFinished=row.get('is_finished'),
			status=row.get('status'),
			type=row.get('type'),
			tableName=row.get('table_name'),
			records=row.get('records')
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

	def create_trigger_event(self, trigger_event: TriggerEvent) -> TriggerEvent:
		self.begin_transaction()
		try:
			event = self.create(trigger_event)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return event
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def update_trigger_event(self, trigger_event: TriggerEvent) -> Optional[TriggerEvent]:
		self.begin_transaction()
		try:
			result = self.update(trigger_event)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return result
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

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

	def find_finished_events(self) -> List[Dict[str, Any]]:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_finished'), right=True)],
				straightColumns=[EntityStraightColumn(columnName=self.get_storable_id_column_name()),
				                 EntityStraightColumn(columnName='tenant_id')],
				sort=[EntitySortColumn(name=self.get_storable_id_column_name(), method=EntitySortMethod.ASC)]
			))
		finally:
			self.close_transaction()

	def find_initial_event_by_tenant_id(self, tenant_id: str) -> Optional[TriggerEvent]:
		self.begin_transaction()
		try:
			res = self.storage.find(self.get_entity_finder(
				criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=0),
				          EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)],
				sort=[EntitySortColumn(name=self.get_storable_id_column_name(), method=EntitySortMethod.ASC)]
			))
			if res:
				# noinspection PyTypeChecker
				return res[0]
			else:
				return None
		finally:
			self.close_transaction()

	def find_executing_event_by_tenant_id(self, tenant_id: str) -> Optional[TriggerEvent]:
		self.begin_transaction()
		try:
			res = self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=1),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
				    ]
			))
			if res:
				# noinspection PyTypeChecker
				return res[0]
			else:
				return None
		finally:
			self.close_transaction()


def get_trigger_event_service(storage: TransactionalStorageSPI,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService
                              ) -> TriggerEventService:
	return TriggerEventService(storage, snowflake_generator, principal_service)
