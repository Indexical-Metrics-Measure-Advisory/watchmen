from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import ConfigDict
from watchmen_model.common import Auditable, TenantBasedTuple, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel

MaterializationId = str
MaterializationFlowId = str
MaterializationRunId = str
MaterializationJobLockId = str


class TimeGrain(str, Enum):
	DAY = 'day'
	WEEK = 'week'
	MONTH = 'month'
	QUARTER = 'quarter'
	YEAR = 'year'


class WriteMode(str, Enum):
	TRUNCATE_INSERT = 'TRUNCATE_INSERT'
	MERGE = 'MERGE'


class MaterializationEngine(str, Enum):
	AUTO = 'AUTO'
	STORAGE = 'STORAGE'
	SPARK = 'SPARK'


class ScheduleFrequency(str, Enum):
	ONCE = 'once'
	DAY = 'day'
	WEEK = 'week'
	MONTH = 'month'


class MaterializationSchedule(ExtendedBaseModel):
	enabled: bool = False
	frequency: ScheduleFrequency = ScheduleFrequency.DAY
	# HH:MM, used by day/week/month/once
	time: Optional[str] = None
	# YYYY-MM-DD, used by once
	date: Optional[str] = None
	# mon..sun, used by week
	weekday: Optional[str] = None
	# 1-31, used by month
	dayOfMonth: Optional[int] = None

	model_config = ConfigDict(use_enum_values=True)


class FactorRole(str, Enum):
	TIME = 'time'
	DIMENSION = 'dimension'
	METRIC = 'metric'
	META = 'meta'


class FactorMappingColumn(ExtendedBaseModel):
	columnName: str
	factorName: str
	factorType: str
	role: FactorRole
	source: Optional[str] = None

	model_config = ConfigDict(use_enum_values=True)


class Materialization(ExtendedBaseModel, UserBasedTuple, Auditable):
	materializationId: MaterializationId = None
	name: Optional[str] = None
	metricId: str = None
	metricName: str = None
	metricLabel: Optional[str] = None
	targetTopicId: Optional[str] = None
	targetTopicName: Optional[str] = None
	# when true and targetTopicId is empty, backend auto-creates a wide topic
	autoCreateTopic: bool = True
	timeGrain: TimeGrain = TimeGrain.DAY
	groupBy: List[str] = []
	writeMode: WriteMode = WriteMode.MERGE
	engine: MaterializationEngine = MaterializationEngine.AUTO
	schedule: MaterializationSchedule = MaterializationSchedule()
	factorMapping: Optional[List[FactorMappingColumn]] = None
	enabled: bool = True
	description: Optional[str] = None
	# presentation only, mirrors lastModifiedAt on read
	updatedAt: Optional[datetime] = None

	model_config = ConfigDict(use_enum_values=True)


class MaterializationFlow(ExtendedBaseModel, UserBasedTuple, Auditable):
	flowId: MaterializationFlowId = None
	name: Optional[str] = None
	materializationIds: List[MaterializationId] = []
	schedule: MaterializationSchedule = MaterializationSchedule()
	enabled: bool = True
	description: Optional[str] = None
	updatedAt: Optional[datetime] = None

	model_config = ConfigDict(use_enum_values=True)


class RunStatus(str, Enum):
	PENDING = 'PENDING'
	RUNNING = 'RUNNING'
	SUCCESS = 'SUCCESS'
	FAILED = 'FAILED'


class RunTriggerType(str, Enum):
	MANUAL = 'manual'
	CRON = 'cron'
	FLOW = 'flow'


class MaterializationRun(ExtendedBaseModel, TenantBasedTuple):
	runId: MaterializationRunId = None
	materializationId: MaterializationId = None
	materializationName: Optional[str] = None
	metricName: Optional[str] = None
	flowId: Optional[MaterializationFlowId] = None
	flowName: Optional[str] = None
	status: RunStatus = RunStatus.PENDING
	triggerType: RunTriggerType = RunTriggerType.MANUAL
	engine: Optional[MaterializationEngine] = None
	windowStart: Optional[date] = None
	windowEnd: Optional[date] = None
	rowCount: Optional[int] = None
	durationMs: Optional[int] = None
	errorMessage: Optional[str] = None
	sqlPreview: Optional[str] = None
	startedAt: Optional[datetime] = None
	finishedAt: Optional[datetime] = None

	model_config = ConfigDict(use_enum_values=True)


class MaterializationJobLockStatus(str, Enum):
	READY = 'ready'
	FAILED = 'fail'
	SUCCESS = 'success'


class MaterializationJobLock(ExtendedBaseModel):
	lockId: MaterializationJobLockId = None
	tenantId: Optional[str] = None
	materializationId: Optional[MaterializationId] = None
	frequency: Optional[ScheduleFrequency] = None
	processDate: Optional[date] = None
	status: MaterializationJobLockStatus = MaterializationJobLockStatus.READY
	userId: Optional[str] = None
	createdAt: Optional[datetime] = None

	model_config = ConfigDict(use_enum_values=True)


class MaterializationRunFilter(ExtendedBaseModel):
	keyword: Optional[str] = None
	status: Optional[RunStatus] = None
	materializationId: Optional[MaterializationId] = None
	pageNumber: Optional[int] = None
	pageSize: Optional[int] = None

	model_config = ConfigDict(use_enum_values=True)


class MaterializationRunRequest(ExtendedBaseModel):
	materializationIds: List[MaterializationId] = []


class FlowGraphNode(ExtendedBaseModel):
	id: str
	materializationId: MaterializationId
	label: str
	metricName: str
	targetTopicName: Optional[str] = None
	status: Optional[RunStatus] = None

	model_config = ConfigDict(use_enum_values=True)


class FlowEdgeKind(str, Enum):
	DATA = 'data'
	MANUAL = 'manual'
	METRIC_REF = 'metricRef'


class FlowGraphEdge(ExtendedBaseModel):
	id: str
	source: str
	target: str
	edgeKind: FlowEdgeKind
	label: Optional[str] = None

	model_config = ConfigDict(use_enum_values=True)


class FlowGraph(ExtendedBaseModel):
	flowId: MaterializationFlowId
	flowName: Optional[str] = None
	nodes: List[FlowGraphNode] = []
	edges: List[FlowGraphEdge] = []
