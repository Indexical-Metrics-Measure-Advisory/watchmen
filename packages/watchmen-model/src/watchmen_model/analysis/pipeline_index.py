from datetime import datetime
from enum import Enum
from typing import Optional, TypeVar


from watchmen_model.common import FactorId, PipelineActionId, PipelineId, PipelineStageId, PipelineUnitId, Storable, \
	TenantId, TopicId
from watchmen_utilities import ExtendedBaseModel

PipelineIndexId = TypeVar('PipelineIndexId', bound=str)


class PipelineIndexRefType(str, Enum):
	DIRECT = 'direct',
	COMPUTED = 'computed'


class PipelineIndex(ExtendedBaseModel, Storable):
	pipelineIndexId: Optional[PipelineIndexId] = None
	pipelineId: Optional[PipelineId] = None
	pipelineName: Optional[str] = None
	stageId: Optional[PipelineStageId] = None
	stageName: Optional[str] = None
	unitId: Optional[PipelineUnitId] = None
	unitName: Optional[str] = None
	actionId: Optional[PipelineActionId] = None
	mappingToTopicId: Optional[TopicId] = None
	mappingToFactorId: Optional[FactorId] = None
	sourceFromTopicId: Optional[TopicId] = None
	sourceFromFactorId: Optional[FactorId] = None
	refType: Optional[PipelineIndexRefType] = None
	tenantId: Optional[TenantId] = None
	createdAt: Optional[datetime] = None
	lastModifiedAt: Optional[datetime] = None
