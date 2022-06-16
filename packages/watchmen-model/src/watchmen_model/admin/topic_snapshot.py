from datetime import date, datetime
from enum import Enum
from typing import Optional, TypeVar

from pydantic import BaseModel

from watchmen_model.common import construct_parameter_joint, OptimisticLock, ParameterJoint, PipelineId, Storable, \
	TenantBasedTuple, TenantId, TopicId, UserId

TopicSnapshotSchedulerId = TypeVar('TopicSnapshotSchedulerId', bound=str)
TopicSnapshotJobLockId = TypeVar('TopicSnapshotJobLockId', bound=str)


class TopicSnapshotFrequency(str, Enum):
	DAILY = 'daily',
	WEEKLY = 'weekly',
	MONTHLY = 'monthly'


class TopicSnapshotScheduler(TenantBasedTuple, OptimisticLock, BaseModel):
	schedulerId: TopicSnapshotSchedulerId = None
	topicId: TopicId = None
	targetTopicName: str = None
	targetTopicId: TopicId = None
	pipelineId: PipelineId = None
	frequency: TopicSnapshotFrequency = TopicSnapshotFrequency.DAILY
	filter: Optional[ParameterJoint] = None
	# only for weekly
	weekday: Optional[str]
	# only for monthly
	day: Optional[str]
	hour: Optional[int] = None
	minute: Optional[int] = None
	enabled: bool = True

	def __setattr__(self, name, value):
		if name == 'filter':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


# noinspection DuplicatedCode
class TopicSnapshotJobLockStatus(str, Enum):
	READY = 'ready'
	FAILED = 'fail',
	SUCCESS = 'success'


class TopicSnapshotJobLock(Storable):
	lockId: TopicSnapshotJobLockId = None
	schedulerId: TopicSnapshotSchedulerId = None
	tenantId: TenantId = None
	frequency: TopicSnapshotFrequency = None
	processDate: date = None
	rowCount: int = 0
	status: TopicSnapshotJobLockStatus = None
	userId: UserId = None,
	createdAt: datetime = None
