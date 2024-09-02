from enum import Enum
from typing import List, Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple, UserGroupId, UserId


class UserRole(str, Enum):
	CONSOLE = 'console',
	ADMIN = 'admin',
	# noinspection SpellCheckingInspection
	SUPER_ADMIN = 'superadmin'


class User(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	userId: Optional[UserId] = None
	name: Optional[str] = None
	nickName: Optional[str] = None
	password: Optional[str] = None
	email: Optional[str] = None
	isActive: bool = True
	groupIds: Optional[List[UserGroupId]] = None
	role: Optional[UserRole] = None
