from typing import List

from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, ParameterJoint, SpaceId, TenantId, TopicId, Tuple, UserGroupId


class SpaceFilter(BaseModel):
	topicId: TopicId = None
	joint: ParameterJoint = None
	enabled: bool = False


class Space(Tuple, OptimisticLock):
	spaceId: SpaceId = None
	topicIds: List[TopicId] = None
	groupIds: List[UserGroupId] = None
	name: str = None
	description: str = None
	tenantId: TenantId = None
	filters: List[SpaceFilter] = None
