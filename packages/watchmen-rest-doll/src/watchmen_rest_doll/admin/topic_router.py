from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import FactorService, TopicService
from watchmen_meta_service.analysis import TopicIndexService
from watchmen_model.admin import Topic, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_engine_cache_enabled, ask_engine_index_enabled, ask_meta_storage, \
	ask_presto_enabled, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank, validate_tenant_id
from watchmen_utilities import ArrayHelper

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_factor_service(topic_service: TopicService) -> FactorService:
	return FactorService(topic_service.snowflake_generator)


def get_topic_index_service(topic_service: TopicService) -> TopicIndexService:
	return TopicIndexService(topic_service.storage, topic_service.snowflake_generator)


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
	get_topic_index_service(topic_service).build_index(topic)


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
async def save_topic(
		topic: Topic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Topic:
	validate_tenant_id(topic, principal_service)

	topic_service = get_topic_service(principal_service)

	if topic_service.is_storable_id_faked(topic.topicId):
		topic_service.begin_transaction()
		try:
			topic_service.redress_storable_id(topic)
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


class QueryTopicDataPage(DataPage):
	data: List[Topic]


@router.post("/topic/name", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=QueryTopicDataPage)
async def find_topics_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryTopicDataPage:
	tenant_id: TenantId = principal_service.get_tenant_id()
	if is_blank(query_name):
		query_name = None

	topic_service = get_topic_service(principal_service)
	topic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		return topic_service.find_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		topic_service.close_transaction()


@router.post("/topic/ids", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Topic])
async def find_topics_by_ids(
		topic_ids: List[TopicId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Topic]:
	if len(topic_ids) == 0:
		return []

	tenant_id: TenantId = principal_service.get_tenant_id()

	topic_service = get_topic_service(principal_service)
	topic_service.begin_transaction()
	try:
		return topic_service.find_by_ids(topic_ids, tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		topic_service.close_transaction()


@router.post("/topic/all", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Topic])
async def find_all_topics(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Topic]:
	tenant_id = principal_service.get_tenant_id()

	topic_service = get_topic_service(principal_service)
	topic_service.begin_transaction()
	try:
		return topic_service.find_all(tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		topic_service.close_transaction()


def remove_topic_index(topic_id: TopicId, topic_service: TopicService) -> None:
	if not ask_engine_index_enabled():
		return
	get_topic_index_service(topic_service).remove_index(topic_id)


def remove_topic_cache(topic_id: TopicId, topic_service: TopicService) -> None:
	if not ask_engine_cache_enabled():
		return
	# TODO remove topic from cache
	pass


def remove_presto_schema(topic_id: TopicId, topic_service: TopicService) -> None:
	if not ask_presto_enabled():
		return
	# TODO remove topic schema from presto
	pass


def post_delete_topic(topic_id: TopicId, topic_service: TopicService) -> None:
	remove_topic_index(topic_id, topic_service)
	remove_topic_cache(topic_id, topic_service)
	remove_presto_schema(topic_id, topic_service)


@router.delete('/topic', tags=[UserRole.SUPER_ADMIN], response_model=Topic)
async def delete_topic_by_id(
		topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[Topic]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)
	topic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.delete(topic_id)
		if topic is None:
			raise_404()
		post_delete_topic(topic.topicId, topic_service)
		topic_service.commit_transaction()
		return topic
	except HTTPException as e:
		topic_service.rollback_transaction()
		raise e
	except Exception as e:
		topic_service.rollback_transaction()
		raise_500(e)
