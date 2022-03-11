from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import DataModel, GraphicPosition, GraphicRect, PipelineGraphicId, TopicId, UserBasedTuple
from watchmen_utilities import ArrayHelper


def construct_rect(rect: Optional[Union[dict, GraphicRect]]) -> Optional[GraphicRect]:
	if rect is None:
		return None
	elif isinstance(rect, GraphicRect):
		return rect
	else:
		return GraphicRect(**rect)


def construct_position(rect: Optional[Union[dict, GraphicPosition]]) -> Optional[GraphicPosition]:
	if rect is None:
		return None
	elif isinstance(rect, GraphicPosition):
		return rect
	else:
		return GraphicPosition(**rect)


class TopicRect(DataModel, BaseModel):
	coordinate: GraphicPosition = None
	frame: GraphicRect = None
	name: GraphicPosition = None

	def __setattr__(self, name, value):
		if name == 'frame':
			super().__setattr__(name, construct_rect(value))
		elif name == 'coordinate':
			super().__setattr__(name, construct_position(value))
		elif name == 'name':
			super().__setattr__(name, construct_position(value))
		else:
			super().__setattr__(name, value)


def construct_topic_rect(rect: Optional[Union[dict, TopicRect]]) -> Optional[TopicRect]:
	if rect is None:
		return None
	elif isinstance(rect, TopicRect):
		return rect
	else:
		return TopicRect(**rect)


class TopicGraphic(DataModel, BaseModel):
	topicId: TopicId = None
	rect: TopicRect = None

	def __setattr__(self, name, value):
		if name == 'rect':
			super().__setattr__(name, construct_topic_rect(value))
		else:
			super().__setattr__(name, value)


# noinspection DuplicatedCode
def construct_topic(topic: Optional[Union[dict, TopicGraphic]]) -> Optional[TopicGraphic]:
	if topic is None:
		return None
	elif isinstance(topic, TopicGraphic):
		return topic
	else:
		return TopicGraphic(**topic)


def construct_topics(topics: List[Union[dict, TopicGraphic]]) -> List[TopicGraphic]:
	if topics is None:
		return []
	return ArrayHelper(topics).map(lambda x: construct_topic(x)).to_list()


class PipelineGraphic(UserBasedTuple, BaseModel):
	pipelineGraphId: PipelineGraphicId = None
	name: str = None
	topics: List[TopicGraphic] = []
	createdAt: datetime = None
	lastModifiedAt: datetime = None

	def __setattr__(self, name, value):
		if name == 'topics':
			super().__setattr__(name, construct_topics(value))
		else:
			super().__setattr__(name, value)
