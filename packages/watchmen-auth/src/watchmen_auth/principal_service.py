from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId, UserId


class PrincipalService:
	tenant_id: TenantId
	user_id: UserId
	name: str
	role: UserRole

	def __init__(self, user: User):
		self.tenant_id = user.tenantId
		self.user_id = user.userId
		self.name = user.name
		self.role = user.role

	def get_tenant_id(self) -> TenantId:
		return self.tenant_id

	def get_user_id(self) -> UserId:
		return self.user_id

	def is_admin(self) -> bool:
		return self.role == UserRole.ADMIN or self.role == UserRole.SUPER_ADMIN

	def is_tenant_admin(self) -> bool:
		return self.role == UserRole.ADMIN

	def is_super_admin(self) -> bool:
		return self.role == UserRole.SUPER_ADMIN
