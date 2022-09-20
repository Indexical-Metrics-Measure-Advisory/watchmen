from datetime import date, datetime
from enum import Enum
from typing import TypeVar

from watchmen_model.common import Storable, TenantId, TopicId, UserId
from .monitor_rule import MonitorRuleStatisticalInterval

MonitorJobLockId = TypeVar('MonitorJobLockId', bound=str)


# noinspection DuplicatedCode
class MonitorJobLockStatus(str, Enum):
	READY = 'ready'
	FAILED = 'fail'
	SUCCESS = 'success'


class MonitorJobLock(Storable):
	lockId: MonitorJobLockId = None
	tenantId: TenantId = None
	topicId: TopicId = None
	frequency: MonitorRuleStatisticalInterval = None
	processDate: date = None
	status: MonitorJobLockStatus = None
	userId: UserId = None
	createdAt: datetime = None
