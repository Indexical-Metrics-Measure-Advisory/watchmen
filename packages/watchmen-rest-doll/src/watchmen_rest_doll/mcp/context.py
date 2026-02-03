from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId, UserId


def get_mcp_principal_service(tenant_id: TenantId, user_id: UserId) -> PrincipalService:
	"""
	Creates a PrincipalService for MCP operations.
	Assumes the agent acts with provided credentials.
	"""
	principal_service = PrincipalService(User(
		userId=user_id,
		tenantId=tenant_id,
		name="mcp-agent",
		role=UserRole.ADMIN  # Default to Admin for now, could be configurable
	))
	return principal_service
