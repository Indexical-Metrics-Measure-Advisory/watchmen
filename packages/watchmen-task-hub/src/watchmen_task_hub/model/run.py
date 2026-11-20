from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, Optional

from watchmen_model.common import TenantBasedTuple, UserId

from .task import TaskDefinitionId, TaskDependencyId, TaskType

TaskRunId = str
TaskRunDependencyId = str


class TaskRunStatus(str, Enum):
	PENDING = 'PENDING'
	WAITING = 'WAITING'
	RUNNING = 'RUNNING'
	SUCCESS = 'SUCCESS'
	FAILED = 'FAILED'
	CANCELLED = 'CANCELLED'
	SKIPPED = 'SKIPPED'
	STALE = 'STALE'


TERMINAL_RUN_STATUSES = {
	TaskRunStatus.SUCCESS.value,
	TaskRunStatus.FAILED.value,
	TaskRunStatus.CANCELLED.value,
	TaskRunStatus.SKIPPED.value,
	TaskRunStatus.STALE.value
}


class TriggerType(str, Enum):
	SCHEDULE = 'SCHEDULE'
	MANUAL = 'MANUAL'
	API = 'API'
	DEPENDENCY = 'DEPENDENCY'


class TaskRun(TenantBasedTuple):
	runId: Optional[TaskRunId] = None
	taskId: TaskDefinitionId
	taskType: TaskType
	instanceKey: str
	attempt: int = 0
	retryOfRunId: Optional[TaskRunId] = None
	processDate: Optional[date] = None
	windowStart: Optional[datetime] = None
	windowEnd: Optional[datetime] = None
	status: TaskRunStatus = TaskRunStatus.PENDING
	triggerType: TriggerType = TriggerType.MANUAL
	bypassDependencies: bool = False
	idempotencyKey: str
	requestHash: Optional[str] = None
	engineRunKey: str
	executionTarget: Optional[str] = None
	callbackTokenHash: Optional[str] = None
	createdAt: Optional[datetime] = None
	startedAt: Optional[datetime] = None
	finishedAt: Optional[datetime] = None
	durationMs: Optional[int] = None
	rowCount: Optional[int] = None
	errorCode: Optional[str] = None
	errorMessage: Optional[str] = None
	resultRefs: Dict[str, Any] = {}
	triggeredBy: Optional[UserId] = None


class RunDependencyState(str, Enum):
	WAITING = 'WAITING'
	SATISFIED = 'SATISFIED'
	VIOLATED = 'VIOLATED'


class TaskRunDependency(TenantBasedTuple):
	runDependencyId: Optional[TaskRunDependencyId] = None
	runId: TaskRunId
	dependencyId: TaskDependencyId
	upstreamRunId: Optional[TaskRunId] = None
	state: RunDependencyState = RunDependencyState.WAITING
	reason: Optional[str] = None
	evaluatedAt: Optional[datetime] = None
