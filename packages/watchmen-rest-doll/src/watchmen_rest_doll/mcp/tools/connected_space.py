from mcp.server.fastmcp import Context

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService
from watchmen_model.console import ConnectedSpace
from watchmen_rest_doll.mcp.context import get_mcp_principal_service
from watchmen_rest_doll.mcp.server import mcp


def get_connected_space_service(principal_service) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@mcp.tool()
def create_connected_space(
		name: str,
		tenant_id: str,
		user_id: str,
		space_id: str = None,
		ctx: Context = None
) -> str:
	"""
	Create a new Connected Space.
	
	Args:
		name: The name of the new connected space.
		tenant_id: The tenant ID for authentication.
		user_id: The user ID for authentication.
		space_id: Optional Space ID to bind to.
	"""
	principal_service = get_mcp_principal_service(tenant_id, user_id)
	connected_space_service = get_connected_space_service(principal_service)

	# Check for duplicates
	existing = connected_space_service.find_by_name(name, tenant_id)
	if existing:
		return f"Error: Connected Space '{name}' already exists."

	connected_space = ConnectedSpace(
		name=name,
		spaceId=space_id,
		tenantId=tenant_id,
		userId=user_id,
		isTemplate=False
	)
	
	connected_space_service.redress_storable_id(connected_space)
	created = connected_space_service.create(connected_space)

	return f"Successfully created Connected Space '{created.name}' (ID: {created.connectId})."
