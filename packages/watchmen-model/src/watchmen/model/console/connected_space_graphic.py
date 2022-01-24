from typing import List

from pydantic import BaseModel

from watchmen.model.common import ConnectedSpaceId, GraphicRect, SubjectId, TenantId, TopicId, Tuple, UserId


class TopicGraphic(BaseModel):
	topicId: TopicId = None
	rect: GraphicRect = None


class SubjectGraphic(BaseModel):
	subjectId: SubjectId = None
	rect: GraphicRect = None


class ConnectedSpaceGraphic(Tuple):
	connectId: ConnectedSpaceId = None
	topics: List[TopicGraphic] = None
	subjects: List[SubjectGraphic] = None
	userId: UserId = None
	tenantId: TenantId = None
