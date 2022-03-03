from typing import Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.analysis import TopicIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, UserRole
from watchmen_model.common import TopicId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.util import trans
from watchmen_utilities import is_blank

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_index_service(topic_service: TopicService) -> TopicIndexService:
	return TopicIndexService(topic_service.storage, topic_service.snowflakeGenerator)


@router.get('/topic/index/build', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def build_topic_index(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)

	def action() -> None:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if principal_service.is_tenant_admin() and topic.tenantId != principal_service.get_tenant_id():
			raise_404()

		topic_index_service = get_topic_index_service(topic_service)
		topic_index_service.build_index(topic)

	return trans(topic_service, action)
