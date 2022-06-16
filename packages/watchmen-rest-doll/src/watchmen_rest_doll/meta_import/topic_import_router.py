from typing import Callable, List, Tuple

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.admin import ask_save_topic_action
from watchmen_rest_doll.util import trans_with_tail
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_tenant_based_tuples

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def bundling_tails(tails: List[Callable[[], None]]) -> Callable[[], None]:
	def end() -> None:
		ArrayHelper(tails).each(lambda x: x())

	return end


@router.post('/topic/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[Topic])
async def import_topics(
		topics: List[Topic], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> List[Topic]:
	if topics is None:
		return []
	if len(topics) == 0:
		return []

	topic_service = get_topic_service(principal_service)

	def action() -> Tuple[List[Topic], Callable[[], None]]:
		validate_tenant_based_tuples(topics, get_user_service(topic_service), principal_service)
		save = ask_save_topic_action(topic_service, principal_service, True)
		# noinspection PyTypeChecker
		results = ArrayHelper(topics).map(lambda x: save(x)).to_list()
		saved_topics = ArrayHelper(results).map(lambda x: x[0]).to_list()
		tails = ArrayHelper(results).map(lambda x: x[1]).to_list()
		return saved_topics, bundling_tails(tails)

	return trans_with_tail(topic_service, action)
