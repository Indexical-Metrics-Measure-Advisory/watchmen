from typing import List

from watchmen_model.common import DataModel, GraphicPosition, GraphicRect, PipelinesGraphicId, TopicId, \
	UserBasedTuple


class TopicRect(DataModel):
	coordinate: GraphicPosition = None
	frame: GraphicRect = None
	name: GraphicPosition = None


class TopicGraphic(DataModel):
	topicId: TopicId = None
	rect: TopicRect = None


class PipelinesGraphic(UserBasedTuple):
	pipelineGraphId: PipelinesGraphicId = None
	name: str = None
	topics: List[TopicGraphic] = []
