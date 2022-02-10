from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_model.admin import Topic, UserRole
from watchmen_rest_doll.admin import ask_save_topic_action
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_tenant_based_tuples

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/topic/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_dashboards(
		topics: List[Topic], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if topics is None:
		return
	if len(topics) == 0:
		return

	topic_service = get_topic_service(principal_service)

	def action() -> None:
		validate_tenant_based_tuples(topics, get_user_service(topic_service), principal_service)
		save = ask_save_topic_action(topic_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(topics).each(lambda x: save(x))

	trans(topic_service, action)
