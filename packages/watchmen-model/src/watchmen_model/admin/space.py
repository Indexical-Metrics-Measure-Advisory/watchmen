from typing import List

from watchmen_model.common import DataModel, OptimisticLock, ParameterJoint, SpaceId, TenantBasedTuple, TopicId, \
	UserGroupId


class SpaceFilter(DataModel):
	topicId: TopicId = None
	joint: ParameterJoint = None
	enabled: bool = False


class Space(TenantBasedTuple, OptimisticLock):
	spaceId: SpaceId = None
	topicIds: List[TopicId] = None
	groupIds: List[UserGroupId] = None
	name: str = None
	description: str = None
	filters: List[SpaceFilter] = None
