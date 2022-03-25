from datetime import datetime
from typing import Callable, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_data_kernel.service import sync_topic_structure_storage
from watchmen_meta.admin import FactorService, TopicService
from watchmen_meta.analysis import TopicIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, TopicType, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, is_blank, is_date, is_not_blank

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_factor_service(topic_service: TopicService) -> FactorService:
	return FactorService(topic_service.snowflakeGenerator)


def get_topic_index_service(topic_service: TopicService) -> TopicIndexService:
	return TopicIndexService(topic_service.storage, topic_service.snowflakeGenerator)


@router.get('/topic', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Topic)
async def load_topic_by_id(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Topic:
	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)

	def action() -> Topic:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		return topic

	return trans_readonly(topic_service, action)


def redress_factor_ids(topic: Topic, topic_service: TopicService) -> None:
	factor_service = get_factor_service(topic_service)
	# noinspection PyTypeChecker
	ArrayHelper(topic.factors).each(lambda x: factor_service.redress_factor_id(x))


def build_topic_index(topic: Topic, topic_service: TopicService) -> None:
	get_topic_index_service(topic_service).build_index(topic)


def post_save_topic(topic: Topic, topic_service: TopicService) -> None:
	build_topic_index(topic, topic_service)
	CacheService.topic().put(topic)


def sync_topic_structure(
		topic: Topic, original_topic: Optional[Topic], principal_service: PrincipalService) -> Callable[[], None]:
	def tail() -> None:
		sync_topic_structure_storage(topic, original_topic, principal_service)

	return tail


# noinspection PyUnusedLocal
def ask_save_topic_action(
		topic_service: TopicService, principal_service: PrincipalService
) -> Callable[[Topic], Tuple[Topic, Callable[[], None]]]:
	def action(topic: Topic) -> Tuple[Topic, Callable[[], None]]:
		if topic_service.is_storable_id_faked(topic.topicId):
			topic_service.redress_storable_id(topic)
			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.create(topic)
			tail = sync_topic_structure(topic, None, principal_service)
		else:
			# noinspection PyTypeChecker
			existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
			if existing_topic is not None:
				if existing_topic.tenantId != topic.tenantId:
					raise_403()

			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.update(topic)
			tail = sync_topic_structure(topic, existing_topic, principal_service)

		post_save_topic(topic, topic_service)

		return topic, tail

	return action


@router.post('/topic', tags=[UserRole.ADMIN], response_model=Topic)
async def save_topic(
		topic: Topic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Topic:
	validate_tenant_id(topic, principal_service)
	topic_service = get_topic_service(principal_service)
	action = ask_save_topic_action(topic_service, principal_service)
	return trans_with_tail(topic_service, lambda: action(topic))


class QueryTopicDataPage(DataPage):
	data: List[Topic]


@router.post('/topic/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=QueryTopicDataPage)
async def find_topics_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryTopicDataPage:
	topic_service = get_topic_service(principal_service)

	def action() -> QueryTopicDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return topic_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return topic_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(topic_service, action)


def to_topic_type(topic_type: str) -> Optional[TopicType]:
	for a_topic_type in TopicType:
		if topic_type == a_topic_type:
			# noinspection PyTypeChecker
			return a_topic_type
	return None


def to_exclude_types(exclude_types: Optional[str]) -> List[TopicType]:
	if is_blank(exclude_types):
		return []
	else:
		return ArrayHelper(exclude_types.strip().split(',')) \
			.map(lambda x: x.strip()) \
			.filter(lambda x: is_not_blank(x)) \
			.map(lambda x: to_topic_type(x)) \
			.filter(lambda x: x is not None) \
			.to_list()


@router.get('/topic/list/name', tags=[UserRole.ADMIN], response_model=List[Topic])
async def find_topics_by_name(
		query_name: Optional[str], exclude_types: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Topic]:
	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return topic_service.find_by_name(None, to_exclude_types(exclude_types), tenant_id)
		else:
			# noinspection PyTypeChecker
			return topic_service.find_by_name(query_name, to_exclude_types(exclude_types), tenant_id)

	return trans_readonly(topic_service, action)


@router.post('/topic/ids', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Topic])
async def find_topics_by_ids(
		topic_ids: List[TopicId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Topic]:
	if len(topic_ids) == 0:
		return []

	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return topic_service.find_by_ids(topic_ids, tenant_id)

	return trans_readonly(topic_service, action)


@router.get('/topic/all', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Topic])
async def find_all_topics(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Topic]:
	tenant_id = principal_service.get_tenant_id()

	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		return topic_service.find_all(tenant_id)

	return trans_readonly(topic_service, action)


class LastModified(BaseModel):
	at: str = None


# noinspection DuplicatedCode
@router.post('/topic/updated', tags=[UserRole.ADMIN], response_model=List[Topic])
async def find_updated_topics(
		lastModified: LastModified, principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Topic]:
	if lastModified is None or is_blank(lastModified.at):
		return []
	parsed, last_modified_at = is_date(lastModified.at, ask_all_date_formats())
	if not parsed:
		return []
	if not isinstance(last_modified_at, datetime):
		last_modified_at = datetime(
			year=last_modified_at.year, month=last_modified_at.month, day=last_modified_at.day,
			hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		return topic_service.find_modified_after(last_modified_at, principal_service.get_tenant_id())

	return trans_readonly(topic_service, action)


def remove_topic_index(topic_id: TopicId, topic_service: TopicService) -> None:
	get_topic_index_service(topic_service).remove_index(topic_id)


def post_delete_topic(topic_id: TopicId, topic_service: TopicService) -> None:
	remove_topic_index(topic_id, topic_service)
	CacheService.topic().remove(topic_id)


@router.delete('/topic', tags=[UserRole.SUPER_ADMIN], response_model=Topic)
async def delete_topic_by_id_by_super_admin(
		topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Topic:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)

	def action() -> Topic:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.delete(topic_id)
		if topic is None:
			raise_404()
		post_delete_topic(topic.topicId, topic_service)
		return topic

	return trans(topic_service, action)
