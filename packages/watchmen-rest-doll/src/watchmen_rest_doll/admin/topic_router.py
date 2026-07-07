from datetime import datetime
from typing import List, Optional

import yaml
from fastapi import APIRouter, Body, Depends, Request, Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_meta.admin import TopicService
from watchmen_meta.analysis import TopicIndexService
from watchmen_model.admin import Topic, TopicKind, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal, get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, is_blank, is_date, is_not_blank

from .topic_common import (
	get_topic_service,
	get_topic_index_service,
	is_system_topic,
	ask_save_topic_action,
	post_save_topic,
	to_exclude_types,
	post_delete_topic,
	LastModified,
	QueryTopicDataPage,
)

router = APIRouter()


@router.get('/topic', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
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


@router.post('/topic', tags=[UserRole.ADMIN], response_model=None)
async def save_topic(
		topic: Topic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Topic:
	validate_tenant_id(topic, principal_service)
	topic_service = get_topic_service(principal_service)
	action = ask_save_topic_action(topic_service, principal_service, True)
	return trans_with_tail(topic_service, lambda: action(topic))


@router.post('/topic/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
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


@router.get('/topic/list/name', tags=[UserRole.ADMIN], response_model=None)
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


@router.get('/topic/name/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_topic_yaml_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	if is_blank(query_name):
		raise_400('Topic name is required.')

	topic_service = get_topic_service(principal_service)

	def action() -> Topic:
		tenant_id: TenantId = principal_service.get_tenant_id()
		topic: Optional[Topic] = topic_service.find_by_name_and_tenant(query_name, tenant_id)
		if topic is None:
			raise_404()
		if is_system_topic(topic):
			raise_404()
		return topic

	topic = trans_readonly(topic_service, action)
	yaml_str = yaml.dump(topic.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.post('/topic/ids', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
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


@router.get('/topic/all', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_all_topics(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Topic]:
	tenant_id = principal_service.get_tenant_id()

	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		return topic_service.find_all(tenant_id)

	return trans_readonly(topic_service, action)


# noinspection DuplicatedCode
@router.post('/topic/updated', tags=[UserRole.ADMIN], response_model=None)
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


@router.delete('/topic', tags=[UserRole.SUPER_ADMIN, UserRole.ADMIN], response_model=None)
async def delete_topic_by_id_by_admin(
		topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
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


@router.get("/topic/index/rebuild", tags=[UserRole.ADMIN])
async def rebuild_topics_index(principal_service: PrincipalService = Depends(get_admin_principal)):
	topic_service = get_topic_service(principal_service)
	index_service = get_topic_index_service(topic_service)

	def action():
		topic_list: List[Topic] = topic_service.find_all(principal_service.get_tenant_id())
		for topic in topic_list:
			if topic.kind == TopicKind.BUSINESS:
				index_service.build_index(topic)

	trans(topic_service, action)
