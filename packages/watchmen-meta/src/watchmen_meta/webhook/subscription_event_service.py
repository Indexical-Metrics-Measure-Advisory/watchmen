from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Tuple, Storable
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_storage import EntityShaper, EntityRow, EntityName


class SubscriptionEventShaper(EntityShaper):
	def serialize(self, subscription_event: SubscriptionEvent) -> EntityRow:
		return TupleShaper.serialize_tenant_based(subscription_event, {
			'subscription_event_id': subscription_event.subscriptionEventId,
			'event_id': subscription_event.eventId,
			'notification_id': subscription_event.notificationId,
			'user_id': subscription_event.userId,
			'weekday': subscription_event.weekdayay,
			'day': subscription_event.day,
			'hour': subscription_event.hour,
			'minute': subscription_event.minute,
			'enabled': subscription_event.enabled,
			'frequency': subscription_event.frequency,
		})

	def deserialize(self, row: EntityRow) -> Tuple:
		return TupleShaper.deserialize_tenant_based(row, SubscriptionEvent(
			subscriptionEventId=row.get('subscription_event_id'),
			eventId=row.get('event_id'),
			notificationId=row.get('notification_id'),
			sourceId=row.get('source_id'),
			userId=row.get("user_id"),
			weekday=row.get('weekday'),
			day=row.get('day'),
			hour=row.get("hour"),
			minute=row.get('minute'),
			enabled=row.get('enabled'),
			frequency=row.get("frequency")
		))


SUBSCRIPTION_EVENTS_ENTITY_NAME = 'subscription_events'
SUBSCRIPTION_EVENTS_ENTITY_SHAPER = SubscriptionEventShaper()


class SubscriptionEventService(TupleService):

	def get_storable_id_column_name(self) -> EntityName:
		return "subscription_event_id"

	def get_storable_id(self, storable: SubscriptionEvent) -> StorableId:
		return storable.subscriptionEventId

	def set_storable_id(self, storable: SubscriptionEvent, storable_id: StorableId) -> Storable:
		storable.subscriptionEventId = storable_id
		return storable

	def get_entity_name(self) -> str:
		return SUBSCRIPTION_EVENTS_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return SUBSCRIPTION_EVENTS_ENTITY_SHAPER