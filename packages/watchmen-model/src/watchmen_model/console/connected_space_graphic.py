from typing import List

from pydantic import BaseModel

from watchmen_model.common import ConnectedSpaceId, DataModel, GraphicRect, SubjectId, TopicId, UserBasedTuple


class TopicGraphic(DataModel):
	topicId: TopicId = None
	rect: GraphicRect = None


class SubjectGraphic(DataModel):
	subjectId: SubjectId = None
	rect: GraphicRect = None


class ConnectedSpaceGraphic(UserBasedTuple, BaseModel):
	connectId: ConnectedSpaceId = None
	topics: List[TopicGraphic] = None
	subjects: List[SubjectGraphic] = None
