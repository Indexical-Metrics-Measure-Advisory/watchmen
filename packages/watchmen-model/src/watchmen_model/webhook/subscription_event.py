from typing import Optional

from pydantic import BaseModel

from watchmen_model.admin import TopicSnapshotFrequency
from watchmen_model.common import OptimisticLock, TenantBasedTuple
from watchmen_model.common.tuple_ids import NotificationDefinitionId, SubscriptionEventId, EventDefinitionId, UserId


class SubscriptionEvent(TenantBasedTuple, OptimisticLock, BaseModel):
	subscriptionEventId: SubscriptionEventId = None
	eventId: EventDefinitionId = None
	notificationId: NotificationDefinitionId = None
	sourceId: str = None
	userId: UserId = None
	# only for weekly
	weekday: Optional[str]
	# only for monthly
	day: Optional[str]
	hour: Optional[int] = None
	minute: Optional[int] = None
	enabled: bool = True
	frequency: TopicSnapshotFrequency = TopicSnapshotFrequency.DAILY
