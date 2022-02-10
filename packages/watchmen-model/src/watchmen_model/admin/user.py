from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple, UserGroupId, UserId


class UserRole(str, Enum):
	CONSOLE = 'console',
	ADMIN = 'admin',
	# noinspection SpellCheckingInspection
	SUPER_ADMIN = 'superadmin'


class User(TenantBasedTuple, OptimisticLock, BaseModel):
	userId: UserId = None
	name: str = None
	nickName: str = None
	password: str = None
	isActive: bool = True
	groupIds: List[UserGroupId] = None
	role: UserRole = None
