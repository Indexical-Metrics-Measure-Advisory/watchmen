from datetime import datetime
from enum import Enum
from typing import Any, List, Optional, TypeVar, Union

from pydantic import BaseModel

from watchmen_model.admin import DeleteTopicActionType, PipelineActionType, ReadTopicActionType, SystemActionType, \
	WriteTopicActionType
from watchmen_model.common import DataModel, PipelineActionId, PipelineId, PipelineStageId, PipelineUnitId, Storable, \
	TopicId
from watchmen_utilities import ArrayHelper
from .pipeline_trigger_data import PipelineTriggerTraceId


class MonitorLogStatus(str, Enum):
	DONE = 'DONE',
	ERROR = 'ERROR',


MonitorLogActionId = TypeVar('MonitorLogActionId', bound=str)


class MonitorLogAction(DataModel, BaseModel):
	uid: MonitorLogActionId
	actionId: PipelineActionId
	type: PipelineActionType
	status: Optional[MonitorLogStatus] = None
	startTime: datetime
	completeTime: datetime
	error: Optional[str] = None
	insertCount: int = 0
	updateCount: int = 0
	deleteCount: int = 0


class MonitorReadAction(MonitorLogAction):
	type: ReadTopicActionType
	value: Optional[Any]
	by: Optional[Any]


class MonitorWriteAction(MonitorLogAction):
	type: WriteTopicActionType
	value: Optional[Any]
	by: Optional[Any]


class MonitorDeleteAction(MonitorLogAction):
	type: DeleteTopicActionType
	value: Optional[Any]
	by: Optional[Any]


class MonitorAlarmAction(MonitorLogAction):
	type: SystemActionType = SystemActionType.ALARM
	conditionResult: bool
	value: Optional[Any]


class MonitorCopyToMemoryAction(MonitorLogAction):
	type: SystemActionType = SystemActionType.COPY_TO_MEMORY
	value: Optional[Any]


class MonitorWriteToExternalAction(MonitorLogAction):
	type: SystemActionType = SystemActionType.WRITE_TO_EXTERNAL
	value: Optional[Any]


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


class MonitorLogUnit(DataModel, BaseModel):
	unitId: PipelineUnitId
	name: str
	startTime: datetime
	completeTime: Optional[datetime] = None
	conditionResult: bool
	actions: List[MonitorLogAction]
	error: Optional[str]

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


class MonitorLogStage(DataModel, BaseModel):
	stageId: PipelineStageId
	name: str
	startTime: datetime
	completeTime: Optional[datetime] = None
	conditionResult: bool
	units: List[MonitorLogUnit]
	error: Optional[str]

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


class PipelineMonitorLog(Storable, BaseModel):
	uid: PipelineMonitorLogId
	traceId: PipelineTriggerTraceId
	pipelineId: PipelineId
	topicId: TopicId
	status: MonitorLogStatus
	startTime: datetime
	completeTime: Optional[datetime] = None
	oldValue: Any
	newValue: Any
	conditionResult: bool
	stages: List[MonitorLogStage]
	error: Optional[str]

	def __setattr__(self, name, value):
		if name == 'stages':
			super().__setattr__(name, construct_stages(value))
		else:
			super().__setattr__(name, value)
