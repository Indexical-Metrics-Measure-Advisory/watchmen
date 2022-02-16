from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import construct_parameter_joint, OptimisticLock, PipelineId, \
	PipelineStageId, PipelineUnitId, TenantBasedTuple, TopicId
from watchmen_utilities import ArrayHelper
from .conditional import Conditional
from .pipeline_action import DeleteTopicActionType, PipelineAction, ReadTopicActionType, SystemActionType, \
	WriteTopicActionType
from .pipeline_action_delete import DeleteRowAction, DeleteRowsAction
from .pipeline_action_read import ExistsAction, ReadFactorAction, ReadFactorsAction, ReadRowAction, ReadRowsAction
from .pipeline_action_system import AlarmAction, CopyToMemoryAction, WriteToExternalAction
from .pipeline_action_write import InsertOrMergeRowAction, InsertRowAction, MergeRowAction, WriteFactorAction


def construct_action(action: Optional[Union[dict, PipelineAction]]) -> Optional[PipelineAction]:
	if action is None:
		return None
	elif isinstance(action, PipelineAction):
		return action
	else:
		action_type = action.get('type')
		if action_type == SystemActionType.ALARM:
			return AlarmAction(**action)
		elif action_type == SystemActionType.COPY_TO_MEMORY:
			return CopyToMemoryAction(**action)
		elif action_type == SystemActionType.WRITE_TO_EXTERNAL:
			return WriteToExternalAction(**action)
		elif action_type == ReadTopicActionType.READ_ROW:
			return ReadRowAction(**action)
		elif action_type == ReadTopicActionType.READ_FACTOR:
			return ReadFactorAction(**action)
		elif action_type == ReadTopicActionType.EXISTS:
			return ExistsAction(**action)
		elif action_type == ReadTopicActionType.READ_ROWS:
			return ReadRowsAction(**action)
		elif action_type == ReadTopicActionType.READ_FACTORS:
			return ReadFactorsAction(**action)
		elif action_type == WriteTopicActionType.MERGE_ROW:
			return MergeRowAction(**action)
		elif action_type == WriteTopicActionType.INSERT_ROW:
			return InsertRowAction(**action)
		elif action_type == WriteTopicActionType.INSERT_OR_MERGE_ROW:
			return InsertOrMergeRowAction(**action)
		elif action_type == WriteTopicActionType.WRITE_FACTOR:
			return WriteFactorAction(**action)
		elif action_type == DeleteTopicActionType.DELETE_ROW:
			return DeleteRowAction(**action)
		elif action_type == DeleteTopicActionType.DELETE_ROWS:
			return DeleteRowsAction(**action)
		else:
			raise Exception(f'Pipeline action type[{action_type}] cannot be recognized.')


def construct_actions(actions: Optional[list] = None) -> Optional[List[PipelineAction]]:
	if actions is None:
		return None
	else:
		return ArrayHelper(actions).map(lambda x: construct_action(x)).to_list()


class PipelineUnit(Conditional, BaseModel):
	unitId: PipelineUnitId = None
	name: str = None
	loopVariableName: str = None
	do: List[PipelineAction] = []

	def __setattr__(self, name, value):
		if name == 'do':
			super().__setattr__(name, construct_actions(value))
		elif name == 'on':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


def construct_unit(unit: Optional[Union[dict, PipelineUnit]]) -> Optional[PipelineUnit]:
	if unit is None:
		return None
	elif isinstance(unit, PipelineUnit):
		return unit
	else:
		return PipelineUnit(**unit)


def construct_units(units: Optional[list] = None) -> Optional[List[PipelineUnit]]:
	if units is None:
		return None
	else:
		return ArrayHelper(units).map(lambda x: construct_unit(x)).to_list()


class PipelineStage(Conditional, BaseModel):
	stageId: PipelineStageId = None
	name: str = None
	units: List[PipelineUnit] = []

	def __setattr__(self, name, value):
		if name == 'units':
			super().__setattr__(name, construct_units(value))
		elif name == 'on':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class PipelineTriggerType(str, Enum):
	INSERT = 'insert',
	MERGE = 'merge',
	INSERT_OR_MERGE = 'insert-or-merge',
	DELETE = 'delete',


def construct_stage(stage: Optional[Union[dict, PipelineStage]]) -> Optional[PipelineStage]:
	if stage is None:
		return None
	elif isinstance(stage, PipelineStage):
		return stage
	else:
		return PipelineStage(**stage)


def construct_stages(stages: Optional[list] = None) -> Optional[List[PipelineStage]]:
	if stages is None:
		return None
	else:
		return ArrayHelper(stages).map(lambda x: construct_stage(x)).to_list()


class Pipeline(Conditional, TenantBasedTuple, OptimisticLock, BaseModel):
	pipelineId: PipelineId = None
	topicId: TopicId = None
	name: str = None
	type: PipelineTriggerType = None
	stages: List[PipelineStage] = []
	enabled: bool = None
	validated: bool = None

	def __setattr__(self, name, value):
		if name == 'stages':
			super().__setattr__(name, construct_stages(value))
		elif name == 'on':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)
