from typing import List

from pydantic import BaseModel

from watchmen_model.common import ConnectedSpaceId, GraphicRect, SubjectId, TopicId, UserBasedTuple


class TopicGraphic(BaseModel):
	topicId: TopicId = None
	rect: GraphicRect = None


class SubjectGraphic(BaseModel):
	subjectId: SubjectId = None
	rect: GraphicRect = None


class ConnectedSpaceGraphic(UserBasedTuple):
	connectId: ConnectedSpaceId = None
	topics: List[TopicGraphic] = None
	subjects: List[SubjectGraphic] = None
