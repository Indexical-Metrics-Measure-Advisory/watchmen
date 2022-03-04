from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, TypeVar, Union

from pydantic import BaseModel

from watchmen_model.admin import DeleteTopicActionType, PipelineActionType, ReadTopicActionType, SystemActionType, \
	WriteTopicActionType
from watchmen_model.common import DataModel, Pageable, PipelineActionId, PipelineId, PipelineStageId, PipelineUnitId, \
	TenantId, TopicId
from watchmen_utilities import ArrayHelper
from .pipeline_trigger_data import PipelineTriggerTraceId


class MonitorLogStatus(str, Enum):
	DONE = 'DONE',  # even step is ignored by prerequisite is false, it is treated as DONE
	IGNORED = 'IGNORED',  # step never be touched
	ERROR = 'ERROR',  # exception occurred


class StandardMonitorLog(DataModel, BaseModel):
	status: MonitorLogStatus
	startTime: Optional[datetime] = None  # keep none when step is ignored
	spentInMills: Optional[int] = 0  # keep 0 when step is ignored
	error: Optional[str]  # if status is ERROR


class ConditionalMonitorLog(StandardMonitorLog):
	prerequisite: bool  # result of prerequisite, True when it is not defined
	prerequisiteDefinedAs: Optional[Any] = None  # definition of prerequisite


MonitorLogActionId = TypeVar('MonitorLogActionId', bound=str)


class MonitorLogAction(StandardMonitorLog):
	uid: MonitorLogActionId
	actionId: PipelineActionId
	type: PipelineActionType
	insertCount: int = 0
	updateCount: int = 0
	deleteCount: int = 0
	definedAs: Optional[Any] = None  # definition of action
	"""
	touched value, 
	for deletion, update and insert, always be list of dict
	for read-exists, bool,
	for read-factor, no arithmetic, Any, depends on factor type
	for read-factor, arithmetic, Decimal
	for read-row, dict
	for read-rows, list of dict
	"""
	touched: Optional[Union[List[Union[Dict[str, Any], Any]], bool, Any, Decimal, Dict[str, Any]]] = None


class MonitorLogFindByAction(MonitorLogAction):
	findBy: Optional[Any] = None  # runtime describing of find by


class MonitorReadAction(MonitorLogFindByAction):
	type: ReadTopicActionType


class MonitorWriteAction(MonitorLogFindByAction):
	type: WriteTopicActionType


class MonitorDeleteAction(MonitorLogFindByAction):
	type: DeleteTopicActionType


class MonitorAlarmAction(MonitorLogAction, ConditionalMonitorLog):
	type: SystemActionType = SystemActionType.ALARM


class MonitorCopyToMemoryAction(MonitorLogAction):
	type: SystemActionType = SystemActionType.COPY_TO_MEMORY


class MonitorWriteToExternalAction(MonitorLogAction):
	type: SystemActionType = SystemActionType.WRITE_TO_EXTERNAL


def is_read_action(action_type: PipelineActionType) -> bool:
	return \
		action_type == ReadTopicActionType.READ_ROW \
		or action_type == ReadTopicActionType.READ_FACTOR \
		or action_type == ReadTopicActionType.EXISTS \
		or action_type == ReadTopicActionType.READ_ROWS \
		or action_type == ReadTopicActionType.READ_FACTORS


def is_write_action(action_type: PipelineActionType) -> bool:
	return \
		action_type == WriteTopicActionType.INSERT_ROW \
		or action_type == WriteTopicActionType.MERGE_ROW \
		or action_type == WriteTopicActionType.INSERT_OR_MERGE_ROW \
		or action_type == WriteTopicActionType.WRITE_FACTOR


def is_delete_action(action_type: PipelineActionType) -> bool:
	return \
		action_type == DeleteTopicActionType.DELETE_ROW \
		or action_type == DeleteTopicActionType.DELETE_ROWS


def construct_action(action: Optional[Union[dict, MonitorLogAction]]) -> Optional[MonitorLogAction]:
	if action is None:
		return None
	elif isinstance(action, MonitorLogAction):
		return action
	else:
		action_type = action.get('type')
		if action_type == SystemActionType.ALARM:
			return MonitorAlarmAction(**action)
		elif action_type == SystemActionType.COPY_TO_MEMORY:
			return MonitorCopyToMemoryAction(**action)
		elif action_type == SystemActionType.WRITE_TO_EXTERNAL:
			return MonitorWriteToExternalAction(**action)
		elif is_read_action(action_type):
			return MonitorReadAction(**action)
		elif is_write_action(action_type):
			return MonitorWriteAction(**action)
		elif is_delete_action(action_type):
			return MonitorDeleteAction(**action)
		else:
			raise Exception(f'Pipeline action type[{action_type}] cannot be recognized.')


def construct_actions(actions: Optional[list] = None) -> Optional[List[MonitorLogAction]]:
	if actions is None:
		return None
	else:
		return ArrayHelper(actions).map(lambda x: construct_action(x)).to_list()


class MonitorLogUnit(ConditionalMonitorLog):
	unitId: PipelineUnitId
	name: str
	loopVariableName: Optional[str] = None
	loopVariableValue: Optional[Any] = None
	actions: List[MonitorLogAction]

	def __setattr__(self, name, value):
		if name == 'actions':
			super().__setattr__(name, construct_actions(value))
		else:
			super().__setattr__(name, value)


def construct_unit(unit: Optional[Union[dict, MonitorLogUnit]]) -> Optional[MonitorLogUnit]:
	if unit is None:
		return None
	elif isinstance(unit, MonitorLogUnit):
		return unit
	else:
		return MonitorLogUnit(**unit)


def construct_units(units: Optional[list] = None) -> Optional[List[MonitorLogUnit]]:
	if units is None:
		return None
	else:
		return ArrayHelper(units).map(lambda x: construct_unit(x)).to_list()


class MonitorLogStage(ConditionalMonitorLog):
	stageId: PipelineStageId
	name: str
	units: List[MonitorLogUnit]

	def __setattr__(self, name, value):
		if name == 'units':
			super().__setattr__(name, construct_units(value))
		else:
			super().__setattr__(name, value)


def construct_stage(stage: Optional[Union[dict, MonitorLogStage]]) -> Optional[MonitorLogStage]:
	if stage is None:
		return None
	elif isinstance(stage, MonitorLogStage):
		return stage
	else:
		return MonitorLogStage(**stage)


def construct_stages(stages: Optional[list] = None) -> Optional[List[MonitorLogStage]]:
	if stages is None:
		return None
	else:
		return ArrayHelper(stages).map(lambda x: construct_stage(x)).to_list()


PipelineMonitorLogId = TypeVar('PipelineMonitorLogId', bound=str)


class PipelineMonitorLog(ConditionalMonitorLog):
	uid: PipelineMonitorLogId
	traceId: PipelineTriggerTraceId
	pipelineId: PipelineId
	topicId: TopicId
	dataId: int
	oldValue: Any
	newValue: Any
	stages: List[MonitorLogStage]

	def __setattr__(self, name, value):
		if name == 'stages':
			super().__setattr__(name, construct_stages(value))
		else:
			super().__setattr__(name, value)


class PipelineMonitorLogCriteria(Pageable):
	topicId: TopicId = None
	pipelineId: PipelineId = None
	startDate: str = None
	endDate: str = None
	status: MonitorLogStatus = None
	traceId: PipelineTriggerTraceId = None
	tenantId: TenantId = None
