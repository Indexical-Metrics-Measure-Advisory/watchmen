from datetime import date, datetime

from watchmen_model.common import Storable
from watchmen_model.common.tuple_ids import SubscriptionEventLockId, TenantId, UserId, SubscriptionEventId
from watchmen_model.dqc.monitor_job_lock import MonitorJobLockStatus


class SubscriptionEventLock(Storable):
	subscriptionEventLockId: SubscriptionEventLockId = None
	tenantId: TenantId = None
	subscriptionEventId: SubscriptionEventId = None
	processDate: date = None
	status: MonitorJobLockStatus = None
	userId: UserId = None
	createdAt: datetime = None
