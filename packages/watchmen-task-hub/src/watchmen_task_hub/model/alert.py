from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from watchmen_model.common import TenantBasedTuple

from .run import TaskRunId
from .task import TaskDefinitionId, TaskType

TaskAlertRuleId = str
TaskAlertEventId = str


class AlertEventType(str, Enum):
	RUN_FAILED = 'run_failed'
	RUN_TIMEOUT = 'run_timeout'
	READINESS_STALE = 'readiness_stale'
	DEPENDENCY_WAITING = 'dependency_waiting'
	DURATION_ANOMALY = 'duration_anomaly'
	ADAPTER_UNSYNCED = 'adapter_unsynced'


class TaskAlertRule(TenantBasedTuple):
	ruleId: Optional[TaskAlertRuleId] = None
	name: str
	scopeTaskId: Optional[TaskDefinitionId] = None
	scopeTaskType: Optional[TaskType] = None
	eventType: AlertEventType
	threshold: Dict[str, Any] = {}
	channel: Dict[str, Any] = {}
	throttleMinutes: int = 30
	enabled: bool = True


class AlertDeliveryStatus(str, Enum):
	PENDING = 'PENDING'
	SENT = 'SENT'
	FAILED = 'FAILED'


class TaskAlertEvent(TenantBasedTuple):
	alertEventId: Optional[TaskAlertEventId] = None
	ruleId: TaskAlertRuleId
	taskId: Optional[TaskDefinitionId] = None
	runId: Optional[TaskRunId] = None
	eventKey: str
	status: AlertDeliveryStatus = AlertDeliveryStatus.PENDING
	payload: Dict[str, Any] = {}
	errorMessage: Optional[str] = None
	createdAt: Optional[datetime] = None
	sentAt: Optional[datetime] = None
