from typing import List

from pydantic import BaseModel

from watchmen_model.common import IndicatorId, OptimisticLock, SpaceId, TenantBasedTuple, UserGroupId, UserId


class UserGroup(TenantBasedTuple, OptimisticLock, BaseModel):
	userGroupId: UserGroupId = None
	name: str = None
	description: str = None
	userIds: List[UserId] = None
	spaceIds: List[SpaceId] = None
	indicatorIds: List[IndicatorId] = None
