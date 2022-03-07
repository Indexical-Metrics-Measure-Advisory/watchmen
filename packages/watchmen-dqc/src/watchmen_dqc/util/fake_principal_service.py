from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole


def fake_super_admin() -> PrincipalService:
	return PrincipalService(User(
		userId='1',
		userName='imma-super',
		tenantId='-1',
		role=UserRole.SUPER_ADMIN
	))
