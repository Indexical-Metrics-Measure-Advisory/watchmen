from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId, UserId


class PrincipalService:
	tenantId: TenantId
	userId: UserId
	name: str
	role: UserRole

	def __init__(self, user: User):
		self.tenantId = user.tenantId
		self.userId = user.userId
		self.name = user.name
		self.role = user.role

	def get_tenant_id(self) -> TenantId:
		return self.tenantId

	def get_user_id(self) -> UserId:
		return self.userId

	def get_user_name(self) -> str:
		return self.name

	def get_user_role(self) -> UserRole:
		return self.role

	def is_admin(self) -> bool:
		return self.role == UserRole.ADMIN or self.role == UserRole.SUPER_ADMIN

	def is_tenant_admin(self) -> bool:
		return self.role == UserRole.ADMIN

	def is_super_admin(self) -> bool:
		return self.role == UserRole.SUPER_ADMIN
