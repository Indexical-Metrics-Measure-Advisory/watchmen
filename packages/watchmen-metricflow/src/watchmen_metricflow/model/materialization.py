from datetime import date, datetime
from enum import Enum
from typing import Any, List, Optional

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
	materializationId: Optional[MaterializationId] = None
	name: Optional[str] = None
	metricId: Optional[str] = None
	metricName: Optional[str] = None
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
	# set on save when groupBy/timeGrain change; the next run rebuilds the
	# history under the new business key, then clears the flag
	rebuildPending: bool = False
	# presentation only, mirrors lastModifiedAt on read
	updatedAt: Optional[datetime] = None

	model_config = ConfigDict(use_enum_values=True)

	def __init__(self, **data: Any):
		# ExtendedBaseModel.__init__ re-assigns the raw input over the validated
		# values, leaving nested models as plain dicts; coerce them back.
		super().__init__(**data)
		raw_schedule = self.__dict__.get('schedule')
		if not isinstance(raw_schedule, MaterializationSchedule):
			self.__dict__['schedule'] = MaterializationSchedule.model_validate(raw_schedule or {})
		raw_factor_mapping = self.__dict__.get('factorMapping')
		if isinstance(raw_factor_mapping, list):
			self.__dict__['factorMapping'] = [
				column if isinstance(column, FactorMappingColumn) else FactorMappingColumn.model_validate(column)
				for column in raw_factor_mapping
			]


class ManualFlowEdge(ExtendedBaseModel):
	"""Manually declared dependency: source must finish before target starts."""
	source: MaterializationId
	target: MaterializationId


class MaterializationFlow(ExtendedBaseModel, UserBasedTuple, Auditable):
	flowId: Optional[MaterializationFlowId] = None
	name: Optional[str] = None
	materializationIds: List[MaterializationId] = []
	# manually declared execution order, merged with the derived data edges
	# when the flow graph is built; members without any edge keep list order
	manualEdges: List[ManualFlowEdge] = []
	schedule: MaterializationSchedule = MaterializationSchedule()
	enabled: bool = True
	description: Optional[str] = None
	updatedAt: Optional[datetime] = None

	model_config = ConfigDict(use_enum_values=True)

	def __init__(self, **data: Any):
		# see Materialization.__init__, ExtendedBaseModel drops nested coercion
		super().__init__(**data)
		raw_schedule = self.__dict__.get('schedule')
		if not isinstance(raw_schedule, MaterializationSchedule):
			self.__dict__['schedule'] = MaterializationSchedule.model_validate(raw_schedule or {})
		raw_manual_edges = self.__dict__.get('manualEdges')
		if isinstance(raw_manual_edges, list):
			self.__dict__['manualEdges'] = [
				edge if isinstance(edge, ManualFlowEdge) else ManualFlowEdge.model_validate(edge)
				for edge in raw_manual_edges
			]


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
	runId: Optional[MaterializationRunId] = None
	materializationId: Optional[MaterializationId] = None
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

	def __init__(self, **data: Any):
		# ExtendedBaseModel.__init__ keeps raw string dates/datetimes from input;
		# coerce them so the shaper binds real date/datetime values.
		super().__init__(**data)
		for key, value_type in (('windowStart', date), ('windowEnd', date),
		                        ('startedAt', datetime), ('finishedAt', datetime)):
			value = self.__dict__.get(key)
			if isinstance(value, str):
				self.__dict__[key] = value_type.fromisoformat(value)


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


class MaterializationPageRequest(ExtendedBaseModel):
	keyword: Optional[str] = None
	pageNumber: Optional[int] = None
	pageSize: Optional[int] = None


class MaterializationRunFilter(ExtendedBaseModel):
	keyword: Optional[str] = None
	# plain string, the UI sends 'ALL' to clear the filter
	status: Optional[str] = None
	materializationId: Optional[MaterializationId] = None
	pageNumber: Optional[int] = None
	pageSize: Optional[int] = None


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
