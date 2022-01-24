from typing import List

from watchmen.model.common import SpaceId, TenantId, Tuple, UserGroupId, UserId


class UserGroup(Tuple):
	userGroupId: UserGroupId = None
	name: str = None
	description: str = None
	userIds: List[UserId] = None
	spaceIds: List[SpaceId] = None
	tenantId: TenantId = None
