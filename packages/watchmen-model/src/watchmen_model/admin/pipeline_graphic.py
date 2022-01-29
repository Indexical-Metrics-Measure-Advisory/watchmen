from typing import List

from pydantic import BaseModel

from watchmen_model.common import GraphicPosition, GraphicRect, PipelinesGraphicId, TopicId, \
	UserBasedTuple


class TopicRect(BaseModel):
	coordinate: GraphicPosition = None
	frame: GraphicRect = None
	name: GraphicPosition = None


class TopicGraphic(BaseModel):
	topicId: TopicId = None
	rect: TopicRect = None


class PipelinesGraphic(UserBasedTuple):
	pipelineGraphId: PipelinesGraphicId = None
	name: str = None
	topics: List[TopicGraphic] = []
