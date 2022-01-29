from typing import List

from watchmen_model.common import OptimisticLock, SpaceId, TenantBasedTuple, UserGroupId, UserId


class UserGroup(TenantBasedTuple, OptimisticLock):
	userGroupId: UserGroupId = None
	name: str = None
	description: str = None
	userIds: List[UserId] = None
	spaceIds: List[SpaceId] = None
