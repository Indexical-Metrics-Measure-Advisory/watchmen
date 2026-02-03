from typing import List, Optional

from mcp.server.fastmcp import Context

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, SubjectService
from watchmen_model.common import TenantId, UserId
from watchmen_model.console import Subject
from watchmen_rest_doll.mcp.context import get_mcp_principal_service
from watchmen_rest_doll.mcp.server import mcp


def get_subject_service(principal_service) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_connected_space_service(subject_service: SubjectService) -> ConnectedSpaceService:
	return ConnectedSpaceService(
		subject_service.storage, subject_service.snowflakeGenerator, subject_service.principalService)


@mcp.tool()
def create_subject(
		name: str,
		connected_space_name: str,
		tenant_id: str,
		user_id: str,
		ctx: Context = None
) -> str:
	"""
	Create a new Subject (dataset) in a specific Connected Space.
	
	Args:
		name: The name of the new subject.
		connected_space_name: The name of the existing connected space to attach this subject to.
		tenant_id: The tenant ID for authentication.
		user_id: The user ID for authentication.
	"""
	principal_service = get_mcp_principal_service(tenant_id, user_id)
	subject_service = get_subject_service(principal_service)
	connected_space_service = get_connected_space_service(subject_service)

	# 1. Find Connected Space
	connected_spaces = connected_space_service.find_by_name(connected_space_name, tenant_id)
	if not connected_spaces:
		return f"Error: Connected Space '{connected_space_name}' not found."
	
	# Assume the first one if multiple (though name should be unique ideally)
	connected_space = connected_spaces[0]

	# 2. Check if Subject already exists
	existing_subject = subject_service.find_by_connect_id_and_name(connected_space.connectId, name)
	if existing_subject:
		return f"Error: Subject '{name}' already exists in Connected Space '{connected_space_name}' (ID: {existing_subject.subjectId})."

	# 3. Create Subject
	subject = Subject(
		name=name,
		connectId=connected_space.connectId,
		tenantId=tenant_id,
		userId=user_id
	)
	
	subject_service.redress_storable_id(subject)
	created_subject = subject_service.create(subject)

	return f"Successfully created Subject '{created_subject.name}' (ID: {created_subject.subjectId}) in Connected Space '{connected_space_name}'."
