from typing import List

from pydantic import BaseModel

from watchmen_model.common import DataModel, GraphicPosition, GraphicRect, PipelinesGraphicId, TopicId, \
	UserBasedTuple


class TopicRect(DataModel, BaseModel):
	coordinate: GraphicPosition = None
	frame: GraphicRect = None
	name: GraphicPosition = None


class TopicGraphic(DataModel, BaseModel):
	topicId: TopicId = None
	rect: TopicRect = None


class PipelineGraphic(UserBasedTuple, BaseModel):
	pipelineGraphId: PipelinesGraphicId = None
	name: str = None
	topics: List[TopicGraphic] = []
