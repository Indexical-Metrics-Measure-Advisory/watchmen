from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field
from watchmen_model.common import OptimisticLock, TenantBasedTuple, UserId
from watchmen_utilities import ExtendedBaseModel

TaskDefinitionId = str
TaskResourceRefId = str
TaskDependencyId = str


class TaskType(str, Enum):
	COLLECTOR_ONLINE = 'collector_online'
	COLLECTOR_BATCH = 'collector_batch'
	MATERIALIZATION = 'materialization'
	MATERIALIZATION_FLOW = 'materialization_flow'
	PIPELINE_EVENT = 'pipeline_event'
	PIPELINE_SNAPSHOT = 'pipeline_snapshot'
	DQC_JOB = 'dqc_job'
	CUSTOM = 'custom'


class ExecutionMode(str, Enum):
	STREAMING = 'STREAMING'
	SCHEDULED = 'SCHEDULED'
	MANUAL = 'MANUAL'
	EVENT = 'EVENT'


class ScheduleMode(str, Enum):
	MANAGED = 'managed'
	MIRRORED = 'mirrored'


class ScheduleFrequency(str, Enum):
	DAILY = 'DAILY'
	WEEKLY = 'WEEKLY'
	MONTHLY = 'MONTHLY'
	INTERVAL = 'INTERVAL'
	CRON = 'CRON'
	EVENT = 'EVENT'
	STREAMING = 'STREAMING'


class MisfirePolicy(str, Enum):
	CATCHUP_WINDOW = 'catchup_window'
	SKIP = 'skip'
	FIRE_ONCE = 'fire_once'


class TaskSchedule(ExtendedBaseModel):
	mode: ScheduleMode = ScheduleMode.MIRRORED
	frequency: ScheduleFrequency = ScheduleFrequency.DAILY
	timeOfDay: Optional[str] = None
	intervalMinutes: Optional[int] = Field(default=None, ge=1)
	cronExpression: Optional[str] = None
	weekday: Optional[int] = Field(default=None, ge=1, le=7)
	dayOfMonth: Optional[int] = Field(default=None, ge=1, le=31)
	timezone: str = 'Asia/Shanghai'
	misfirePolicy: MisfirePolicy = MisfirePolicy.CATCHUP_WINDOW
	graceMinutes: int = Field(default=30, ge=0)
	dependencyWaitTimeoutMinutes: int = Field(default=60, ge=1)
	freshnessSlaMinutes: Optional[int] = Field(default=None, ge=1)


class EngineRef(ExtendedBaseModel):
	kind: str
	id: str


class ExternalTriggerConfig(ExtendedBaseModel):
	enabled: bool = True


class TaskCallbackConfig(ExtendedBaseModel):
	enabled: bool = False
	url: Optional[str] = None
	events: List[str] = Field(default_factory=lambda: ['RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'STALE'])
	timeoutSeconds: int = Field(default=5, ge=1, le=60)


class TaskDefinition(TenantBasedTuple, OptimisticLock):
	taskId: Optional[TaskDefinitionId] = None
	name: str
	description: Optional[str] = None
	taskType: TaskType
	executionMode: ExecutionMode
	engineRef: EngineRef
	schedule: Optional[TaskSchedule] = None
	enabled: bool = True
	ownerId: Optional[UserId] = None
	tags: List[str] = []
	params: Dict[str, Any] = {}
	externalTrigger: ExternalTriggerConfig = ExternalTriggerConfig()
	callback: TaskCallbackConfig = TaskCallbackConfig()
	dependencyWaitTimeoutMinutes: int = 60
	freshnessSlaMinutes: Optional[int] = None
	syncedAt: Optional[datetime] = None
	lastRunSummary: Optional[Dict[str, Any]] = None

	def __init__(self, **data: Any):
		super().__init__(**data)
		raw_schedule = self.__dict__.get('schedule')
		if raw_schedule is not None and not isinstance(raw_schedule, TaskSchedule):
			self.__dict__['schedule'] = TaskSchedule.model_validate(raw_schedule)
		raw_engine_ref = self.__dict__.get('engineRef')
		if isinstance(raw_engine_ref, dict):
			self.__dict__['engineRef'] = EngineRef.model_validate(raw_engine_ref)
		for key, value_type in (('externalTrigger', ExternalTriggerConfig), ('callback', TaskCallbackConfig)):
			value = self.__dict__.get(key)
			if value is None:
				self.__dict__[key] = value_type()
			elif isinstance(value, dict):
				self.__dict__[key] = value_type.model_validate(value)


class RefType(str, Enum):
	TOPIC = 'topic'
	PIPELINE = 'pipeline'
	SUBJECT = 'subject'
	METRIC = 'metric'
	MATERIALIZATION = 'materialization'
	FLOW = 'flow'
	DATA_SOURCE = 'data_source'
	SOURCE_TABLE = 'source_table'


class RefRole(str, Enum):
	TARGET = 'TARGET'
	SOURCE = 'SOURCE'


class TaskResourceRef(TenantBasedTuple):
	refId: Optional[TaskResourceRefId] = None
	taskId: TaskDefinitionId
	refType: RefType
	targetId: str
	targetName: Optional[str] = None
	role: RefRole
	inferred: bool = False
	unresolved: bool = False


class DependencyKind(str, Enum):
	EXPLICIT = 'explicit'
	INFERRED_DATA = 'inferred_data'


class DependencyAdoptionStatus(str, Enum):
	PROPOSED = 'PROPOSED'
	ACCEPTED = 'ACCEPTED'
	REJECTED = 'REJECTED'


class DependencyCondition(str, Enum):
	ON_SUCCESS = 'ON_SUCCESS'
	ON_FINISH = 'ON_FINISH'
	ON_FAILURE = 'ON_FAILURE'


class UpstreamInstancePolicy(str, Enum):
	LATEST_RUN = 'LATEST_RUN'
	SAME_WINDOW = 'SAME_WINDOW'


class TaskDependency(TenantBasedTuple):
	dependencyId: Optional[TaskDependencyId] = None
	upstreamTaskId: TaskDefinitionId
	downstreamTaskId: TaskDefinitionId
	kind: DependencyKind = DependencyKind.EXPLICIT
	adoptionStatus: DependencyAdoptionStatus = DependencyAdoptionStatus.ACCEPTED
	condition: DependencyCondition = DependencyCondition.ON_SUCCESS
	instancePolicy: UpstreamInstancePolicy = UpstreamInstancePolicy.LATEST_RUN
	enabled: bool = True
	offsetDays: int = 0
	declaredBy: Optional[UserId] = None
