from enum import Enum
from typing import Optional

from pydantic import BaseModel

from watchmen_model.admin import TopicSnapshotFrequency
from watchmen_model.common import NotificationDefinitionId, OptimisticLock, SubscriptionEventId, TenantBasedTuple, \
	UserId
from watchmen_model.webhook.event_defination import EventSource


class ContentType(Enum):
	pass


class SubscriptionEvent(TenantBasedTuple, OptimisticLock, BaseModel):
	subscriptionEventId: SubscriptionEventId = None
	# eventId: EventDefinitionId = None
	eventCode: str = None
	eventSource: EventSource = None
	notificationId: NotificationDefinitionId = None
	sourceId: str = None
	userId: UserId = None
	contentType: ContentType = None
	# only for weekly
	weekday: Optional[str]
	# only for monthly
	day: Optional[str]
	hour: Optional[int] = None
	minute: Optional[int] = None
	enabled: bool = True
	status: bool = None
	frequency: TopicSnapshotFrequency = TopicSnapshotFrequency.DAILY

# TODO exception case monitor
