from watchmen_meta.common import TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_model.webhook.subscription_event_lock import SubscriptionEventLock
from watchmen_storage import EntityShaper, EntityRow, EntityName


class SubscriptionEventLockShaper(EntityShaper):
	def serialize(self, subscription_event_lock: SubscriptionEventLock) -> EntityRow:
		return {
			'subscription_event_lock_id': subscription_event_lock.subscriptionEventLockId,
			'subscription_event_id': subscription_event_lock.subscriptionEventId,
			'user_id': subscription_event_lock.userId,
			'tenant_id': subscription_event_lock.tenantId,
			'status': subscription_event_lock.status,
			'created_at': subscription_event_lock.createdAt,
			'process_date': subscription_event_lock.processDate
		}

	def deserialize(self, row: EntityRow) -> SubscriptionEventLock:
		return SubscriptionEventLock(
			subscriptionEventLockId=row.get('subscription_event_lock_id'),
			subscriptionEventId=row.get('subscription_event_id'),
			userId=row.get('user_id'),
			tenantId=row.get('tenant_id'),
			status=row.get('status'),
			createdAt=row.get('created_at'),
			processDate=row.get("process_date")
		)


SUBSCRIPTION_EVENT_LOCK_ENTITY_NAME = 'subscription_event_locks'
SUBSCRIPTION_EVENT_LOCK_ENTITY_SHAPER = SubscriptionEventLockShaper()


class SubscriptionEventLockService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_storable_id_column_name(self) -> EntityName:
		return "subscription_event_lock_id"

	def get_storable_id(self, storable: SubscriptionEventLock) -> StorableId:
		return storable.subscriptionEventLockId

	def set_storable_id(self, storable: SubscriptionEventLock, storable_id: StorableId) -> Storable:
		storable.subscriptionEventLockId = storable_id
		return storable

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return SUBSCRIPTION_EVENT_LOCK_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return SUBSCRIPTION_EVENT_LOCK_ENTITY_SHAPER
