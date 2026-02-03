from typing import List, Optional

from mcp.server.fastmcp import Context

from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, TopicType, TopicKind
from watchmen_rest_doll.mcp.context import get_mcp_principal_service
from watchmen_rest_doll.mcp.server import mcp


def get_topic_service(principal_service) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@mcp.tool()
def create_topic(
		name: str,
		tenant_id: str,
		user_id: str,
		kind: str = "business",
		type: str = "distinct",
		ctx: Context = None
) -> str:
	"""
	Create a new Topic (Data Model).
	
	Args:
		name: The name of the topic.
		tenant_id: The tenant ID.
		user_id: The user ID.
		kind: Topic kind (system, business, synonym). Default is 'business'.
		type: Topic type (distinct, aggregate, etc.). Default is 'distinct'.
	"""
	principal_service = get_mcp_principal_service(tenant_id, user_id)
	topic_service = get_topic_service(principal_service)

	# Check existence
	existing = topic_service.find_by_name(name, tenant_id)
	if existing:
		return f"Error: Topic '{name}' already exists."

	topic = Topic(
		name=name,
		kind=TopicKind(kind),
		type=TopicType(type),
		tenantId=tenant_id,
		userId=user_id
	)
	
	topic_service.redress_storable_id(topic)
	created = topic_service.create(topic)

	return f"Successfully created Topic '{created.name}' (ID: {created.topicId})."
