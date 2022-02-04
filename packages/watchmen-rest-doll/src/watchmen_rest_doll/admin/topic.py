from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import FactorService, TopicService
from watchmen_meta_service.analysis import FactorIndexService
from watchmen_model.admin import Topic, UserRole
from watchmen_model.common import TopicId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal, get_console_principal
from watchmen_rest_doll.doll import ask_engine_cache_enabled, ask_engine_index_enabled, ask_meta_storage, \
	ask_presto_enabled, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, validate_tenant_id
from watchmen_utilities import ArrayHelper

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_factor_service(topic_service: TopicService) -> FactorService:
	return FactorService(topic_service.snowflake_generator)


def get_factor_index_service(topic_service: TopicService) -> FactorIndexService:
	return FactorIndexService(topic_service.storage, topic_service.snowflake_generator)


@router.get('/topic', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Topic)
async def load_topic_by_id(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Optional[Topic]:
	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)
	topic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		return topic
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		topic_service.close_transaction()


def redress_factor_ids(topic: Topic, topic_service: TopicService) -> None:
	factor_service = get_factor_service(topic_service)
	# noinspection PyTypeChecker
	ArrayHelper(topic.factors).each(lambda x: factor_service.redress_factor_id(x))


def build_topic_index(topic: Topic, topic_service: TopicService) -> None:
	if not ask_engine_index_enabled():
		return
	get_factor_index_service(topic_service).build_index(topic)


def build_topic_cache(topic: Topic, topic_service: TopicService) -> None:
	if not ask_engine_cache_enabled():
		return
	# TODO build topic cache
	pass


def build_presto_schema(topic: Topic, topic_service: TopicService) -> None:
	if not ask_presto_enabled():
		return
	# TODO build presto schema for topic
	pass


def post_save_topic(topic: Topic, topic_service: TopicService) -> None:
	build_topic_index(topic, topic_service)
	build_topic_cache(topic, topic_service)
	build_presto_schema(topic, topic_service)


@router.post("/topic", tags=[UserRole.ADMIN], response_model=Topic)
async def save_enum(
		topic: Topic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Topic:
	validate_tenant_id(topic, principal_service)

	topic_service = get_topic_service(principal_service)

	if topic_service.is_tuple_id_faked(topic.topicId):
		topic_service.begin_transaction()
		try:
			topic_service.redress_tuple_id(topic)
			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.create(topic)
			post_save_topic(topic, topic_service)
			topic_service.commit_transaction()
		except Exception as e:
			topic_service.rollback_transaction()
			raise_500(e)
	else:
		topic_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
			if existing_topic is not None:
				if existing_topic.tenantId != topic.tenantId:
					raise_403()

			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.update(topic)
			post_save_topic(topic, topic_service)
			topic_service.commit_transaction()
		except HTTPException as e:
			topic_service.rollback_transaction()
			raise e
		except Exception as e:
			topic_service.rollback_transaction()
			raise_500(e)

	return topic

# @router.post("/topic/name", tags=["admin"], response_model=DataPage)
# async def query_topic_list_by_name(query_name: str, pagination: Pagination = Body(...),
#                                    current_user: User = Depends(deps.get_current_user)):
#     result = query_topic_list_with_pagination(query_name, pagination, current_user)
#     # merge_summary_data_for_topic(result,current_user)
#     return result
# @router.get("/topic/query", tags=["admin"], response_model=List[Topic])
# async def load_topic_list_by_name_without_page(query_name, current_user: User = Depends(deps.get_current_user)):
#     return load_topic_list_by_name(query_name, current_user)
# @router.post("/topic/list/name", tags=["admin"], response_model=List[Topic])
# async def load_topic_list_by_name_list(name_list: List[str], current_user: User = Depends(deps.get_current_user)) -> \
#         List[Topic]:
#     results = []
#     for name in name_list:
#         results.append(load_topic_by_name(name, current_user))
#     return results
# @router.get("/topic/name/tenant", tags=["admin"], response_model=Topic)
# async def load_topic_by_name_and_tenant(name: str, tenant_id: str, current_user: User = Depends(deps.get_current_user)):
#     return get_topic_by_name_and_tenant_id(name, tenant_id)
