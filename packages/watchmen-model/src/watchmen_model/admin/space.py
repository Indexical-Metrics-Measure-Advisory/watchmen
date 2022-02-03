from typing import List

from pydantic import BaseModel

from watchmen_model.common import DataModel, OptimisticLock, ParameterJoint, SpaceId, TenantBasedTuple, TopicId, \
	UserGroupId


class SpaceFilter(DataModel, BaseModel):
	topicId: TopicId = None
	joint: ParameterJoint = None
	enabled: bool = False


class Space(TenantBasedTuple, OptimisticLock, BaseModel):
	spaceId: SpaceId = None
	name: str = None
	description: str = None
	topicIds: List[TopicId] = None
	groupIds: List[UserGroupId] = None
	filters: List[SpaceFilter] = None
