from typing import Optional

from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId, UserId
from watchmen_utilities import is_blank
from .principal_service import PrincipalService


def fake_super_admin() -> PrincipalService:
	return PrincipalService(User(
		userId='1',
		userName='imma-super',
		tenantId='-1',
		role=UserRole.SUPER_ADMIN
	))


def fake_tenant_admin(
		tenant_id: TenantId,
		user_id: Optional[UserId] = None, user_name: Optional[str] = None) -> PrincipalService:
	return PrincipalService(User(
		userId='1' if is_blank(user_id) else user_id,
		userName='imma-super' if is_blank(user_name) else user_name,
		tenantId='-1' if is_blank(tenant_id) else tenant_id,
		role=UserRole.ADMIN
	))
