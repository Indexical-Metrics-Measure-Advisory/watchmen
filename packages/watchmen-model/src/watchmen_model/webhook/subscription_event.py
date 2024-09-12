from enum import Enum
from typing import Optional

from watchmen_model.admin import TopicSnapshotFrequency
from watchmen_model.common import NotificationDefinitionId, OptimisticLock, SubscriptionEventId, TenantBasedTuple, \
	UserId
from watchmen_model.webhook.event_defination import EventSource
from watchmen_utilities import ExtendedBaseModel


class ContentType(Enum):
	pass


class SubscriptionEvent(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	subscriptionEventId: Optional[SubscriptionEventId] = None
	# eventId: EventDefinitionId = None
	eventCode: Optional[str] = None
	eventSource: Optional[EventSource] = None
	notificationId: Optional[NotificationDefinitionId] = None
	sourceId: Optional[str] = None
	userId: Optional[UserId] = None
	contentType: Optional[ContentType] = None
	# only for weekly
	weekday: Optional[str] = None
	# only for monthly
	day: Optional[str] = None
	hour: Optional[int] = None
	minute: Optional[int] = None
	enabled: bool = True
	status: Optional[bool] = None
	frequency: TopicSnapshotFrequency = TopicSnapshotFrequency.DAILY

# TODO exception case monitor
