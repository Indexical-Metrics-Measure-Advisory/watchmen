from datetime import datetime
from enum import Enum
from typing import Optional, TypeVar

from pydantic import BaseModel

from watchmen_model.common import FactorId, PipelineActionId, PipelineId, PipelineStageId, PipelineUnitId, Storable, \
	TenantId, TopicId

PipelineIndexId = TypeVar('PipelineIndexId', bound=str)


class PipelineIndexRefType(str, Enum):
	DIRECT = 'direct',
	COMPUTED = 'computed'


class PipelineIndex(Storable, BaseModel):
	pipelineIndexId: PipelineIndexId = None
	pipelineId: PipelineId = None
	pipelineName: str = None
	stageId: PipelineStageId = None
	stageName: str = None
	unitId: PipelineUnitId = None
	unitName: str = None
	actionId: PipelineActionId = None
	mappingToTopicId: Optional[TopicId] = None
	mappingToFactorId: Optional[FactorId] = None
	sourceFromTopicId: Optional[TopicId] = None
	sourceFromFactorId: Optional[FactorId] = None
	refType: PipelineIndexRefType = None
	tenantId: TenantId = None
	createdAt: datetime = None
	lastModifiedAt: datetime = None
