from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from watchmen_model.common import TenantBasedTuple

from .task import TaskDefinitionId

TaskSyncStateId = str
TaskJobLockId = str


class AdapterSyncStatus(str, Enum):
	HEALTHY = 'HEALTHY'
	UNSYNCED = 'UNSYNCED'


class TaskSyncState(TenantBasedTuple):
	syncId: Optional[TaskSyncStateId] = None
	adapterName: str
	cursor: Dict[str, Any] = {}
	status: AdapterSyncStatus = AdapterSyncStatus.HEALTHY
	lastSyncAt: Optional[datetime] = None
	lastSuccessAt: Optional[datetime] = None
	errorMessage: Optional[str] = None


class TaskJobLock(TenantBasedTuple):
	lockId: Optional[TaskJobLockId] = None
	taskId: TaskDefinitionId
	instanceKey: str
	attempt: int = 0
	runId: str
	ownerId: Optional[str] = None
	lockedAt: Optional[datetime] = None
	expiresAt: Optional[datetime] = None
