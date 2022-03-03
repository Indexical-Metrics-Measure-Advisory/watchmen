from typing import List, Optional

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
from watchmen_rest_doll.util import trans, trans_readonly
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


@router.get('/topic/index/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[Topic])
async def fetch_topic_by_name(
		query_name: Optional[str] = None, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[Topic]:
	if is_blank(query_name):
		raise_400('Name criteria is required.')

	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		topic_index_service = get_topic_index_service(topic_service)
		return topic_index_service.find(query_name)

	return trans_readonly(topic_service, action)
# @router.get("/query/topic/factor/index", tags=["index"], response_model=List[Topic])
# async def load_topic_by_factor_index(query_name: str, current_user: User = Depends(deps.get_current_user)):
#     factor_index_list = factor_index_storage.load_factor_index_by_factor_name(query_name, current_user.tenantId)
#     topic_factor_index_list = factor_index_storage.load_factor_index_by_topic_name(query_name, current_user.tenantId)
#     all_list = factor_index_list + topic_factor_index_list
#     topic_id_list = []
#
#     # print(all_list)
#     for factor_index in all_list:
#         if factor_index.topicId not in topic_id_list:
#             topic_id_list.append(factor_index.topicId)
#     #
#     # print(topic_id_list)
#     if topic_id_list:
#         result = get_topic_list_by_ids(topic_id_list, current_user)
#         print(result)
#         return result
#     else:
#         return []
