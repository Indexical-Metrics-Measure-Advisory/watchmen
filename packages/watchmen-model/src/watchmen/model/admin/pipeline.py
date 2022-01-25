from typing import List

from pydantic import BaseModel

from watchmen.model.admin import Enum
from watchmen.model.admin.pipeline_action import PipelineAction
from watchmen.model.common import ParameterJoint, PipelineId, PipelineStageId, PipelineUnitId, TenantId, TopicId, Tuple


class Conditional(BaseModel):
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


class Pipeline(Conditional, Tuple):
	pipelineId: PipelineId = None
	topicId: TopicId = None
	name: str = None
	type: PipelineTriggerType = None
	stages: List[PipelineStage] = []
	enabled: bool = None
	validated: bool = None
	tenantId: TenantId = None
