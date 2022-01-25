from typing import List

from pydantic import BaseModel

from watchmen_model.common import GraphicPosition, GraphicRect, PipelinesGraphicId, TenantId, TopicId, Tuple, UserId


class TopicRect(BaseModel):
	coordinate: GraphicPosition = None
	frame: GraphicRect = None
	name: GraphicPosition = None


class TopicGraphic(BaseModel):
	topicId: TopicId = None
	rect: TopicRect = None


class PipelinesGraphic(Tuple):
	pipelineGraphId: PipelinesGraphicId = None
	name: str = None
	topics: List[TopicGraphic] = []
	userId: UserId = None
	tenantId: TenantId = None
