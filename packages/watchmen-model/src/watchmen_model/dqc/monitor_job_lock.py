from datetime import date, datetime
from typing import TypeVar

from watchmen_model.common import DataModel, Storable, TenantId, TopicId, UserId
from .monitor_rule import MonitorRuleStatisticalInterval

MonitorJobLockId = TypeVar('MonitorJobLockId', bound=str)


class MonitorJobLock(DataModel, Storable):
	lockId: MonitorJobLockId = None
	tenantId: TenantId = None
	topicId: TopicId = None
	frequency: MonitorRuleStatisticalInterval = None
	processDate: date = None
	userId: UserId = None,
	createdAt: datetime = None
