from datetime import date, datetime
from enum import Enum

from watchmen_model.common import Storable
from watchmen_model.common.tuple_ids import SubscriptionEventLockId, TenantId, UserId, SubscriptionEventId


class JobLockStatus(str, Enum):
	READY = 'ready'
	FAILED = 'fail'
	SUCCESS = 'success'


class SubscriptionEventLock(Storable):
	subscriptionEventLockId: SubscriptionEventLockId = None
	tenantId: TenantId = None
	subscriptionEventId: SubscriptionEventId = None
	processDate: date = None
	status: JobLockStatus = None
	userId: UserId = None
	createdAt: datetime = None
