from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import DataModel, OptimisticLock, ParameterJoint, PipelineId, PipelineStageId, \
	PipelineUnitId, TenantBasedTuple, TopicId
from .pipeline_action import PipelineAction


class Conditional(DataModel):
	conditional: bool = None
	on: ParameterJoint = None


class PipelineUnit(Conditional):
	unitId: PipelineUnitId = None
	name: str = None
	loopVariableName: str = None
	do: List[PipelineAction] = []


class PipelineStage(Conditional):
	stageId: PipelineStageId = None
	name: str = None
	units: List[PipelineUnit] = []


class PipelineTriggerType(str, Enum):
	INSERT = 'insert',
	MERGE = 'merge',
	INSERT_OR_MERGE = 'insert-or-merge',
	DELETE = 'delete',


class Pipeline(Conditional, TenantBasedTuple, OptimisticLock, BaseModel):
	pipelineId: PipelineId = None
	topicId: TopicId = None
	name: str = None
	type: PipelineTriggerType = None
	stages: List[PipelineStage] = []
	enabled: bool = None
	validated: bool = None
