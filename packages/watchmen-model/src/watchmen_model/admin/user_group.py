from typing import List

from watchmen_model.common import OptimisticLock, SpaceId, TenantId, Tuple, UserGroupId, UserId


class UserGroup(Tuple, OptimisticLock):
	userGroupId: UserGroupId = None
	name: str = None
	description: str = None
	userIds: List[UserId] = None
	spaceIds: List[SpaceId] = None
	tenantId: TenantId = None
