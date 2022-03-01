from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import ConnectedSpaceId, DataModel, GraphicRect, SubjectId, TopicId, UserBasedTuple
from watchmen_utilities import ArrayHelper
from .utils import construct_rect


class TopicGraphic(DataModel, BaseModel):
	topicId: TopicId = None
	rect: GraphicRect = None

	def __setattr__(self, name, value):
		if name == 'rect':
			super().__setattr__(name, construct_rect(value))
		else:
			super().__setattr__(name, value)


class SubjectGraphic(DataModel, BaseModel):
	subjectId: SubjectId = None
	rect: GraphicRect = None

	def __setattr__(self, name, value):
		if name == 'rect':
			super().__setattr__(name, construct_rect(value))
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


def construct_subject(subject: Optional[Union[dict, SubjectGraphic]]) -> Optional[SubjectGraphic]:
	if subject is None:
		return None
	elif isinstance(subject, SubjectGraphic):
		return subject
	else:
		return SubjectGraphic(**subject)


def construct_subjects(subjects: List[Union[dict, SubjectGraphic]]) -> List[SubjectGraphic]:
	if subjects is None:
		return []
	return ArrayHelper(subjects).map(lambda x: construct_subject(x)).to_list()


class ConnectedSpaceGraphic(UserBasedTuple, BaseModel):
	connectId: ConnectedSpaceId = None
	topics: List[TopicGraphic] = None
	subjects: List[SubjectGraphic] = None

	def __setattr__(self, name, value):
		if name == 'topics':
			super().__setattr__(name, construct_topics(value))
		elif name == 'subjects':
			super().__setattr__(name, construct_subjects(value))
		else:
			super().__setattr__(name, value)
