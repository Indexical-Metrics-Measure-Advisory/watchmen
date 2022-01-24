from enum import Enum
from typing import List

from watchmen.model.common import TenantId, Tuple, UserGroupId, UserId


class UserRole(str, Enum):
	CONSOLE = 'console',
	ADMIN = 'admin',
	SUPER_ADMIN = 'superadmin'


class User(Tuple):
	userId: UserId = None
	name: str = None
	nickName: str = None
	password: str = None
	is_active: bool = True
	groupIds: List[UserGroupId] = None
	role: UserRole = None
	tenantId: TenantId = None
