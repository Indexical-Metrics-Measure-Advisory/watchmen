from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import SpaceService, TopicService, UserGroupService
from watchmen_model.admin import Space, UserGroup, UserRole
from watchmen_model.common import DataPage, Pageable, SpaceId, TenantId, TopicId, UserGroupId
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.auth import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank, trans, trans_readonly, validate_tenant_id
from watchmen_utilities import ArrayHelper

router = APIRouter()


def get_space_service(principal_service: PrincipalService) -> SpaceService:
	return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_group_service(space_service: SpaceService) -> UserGroupService:
	return UserGroupService(space_service.storage, space_service.snowflake_generator, space_service.principal_service)


def get_topic_service(space_service: SpaceService) -> TopicService:
	return TopicService(space_service.storage, space_service.snowflake_generator, space_service.principal_service)


@router.get('/space', tags=[UserRole.ADMIN], response_model=Space)
async def load_space_by_id(
		space_id: Optional[SpaceId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Space:
	if is_blank(space_id):
		raise_400('Space id is required.')

	space_service = get_space_service(principal_service)

	def action() -> Space:
		# noinspection PyTypeChecker
		space: Space = space_service.find_by_id(space_id)
		if space is None:
			raise_404()
		# tenant id must match current principal's
		if space.tenantId != principal_service.get_tenant_id():
			raise_404()
		return space

	return trans_readonly(space_service, action)


# noinspection DuplicatedCode
def has_space_id(user_group: UserGroup, space_id: SpaceId) -> bool:
	if user_group.spaceIds is None:
		return False
	elif len(user_group.spaceIds) == 0:
		return False
	else:
		return space_id in user_group.spaceIds


def append_space_id_to_user_group(user_group: UserGroup, space_id: SpaceId) -> UserGroup:
	if user_group.spaceIds is None:
		user_group.spaceIds = [space_id]
	else:
		user_group.spaceIds.append(space_id)
	return user_group


def update_user_group(user_group_service: UserGroupService, user_group: UserGroup) -> None:
	user_group_service.update(user_group)


# noinspection DuplicatedCode
def sync_space_to_groups(
		space_service: SpaceService,
		space_id: SpaceId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(space_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: not has_space_id(x, space_id)) \
		.map(lambda x: append_space_id_to_user_group(x, space_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def remove_space_id_from_user_group(user_group: UserGroup, space_id: SpaceId) -> UserGroup:
	user_group.spaceIds = ArrayHelper(user_group.spaceIds).filter(lambda x: x != space_id).to_list()
	return user_group


# noinspection DuplicatedCode
def remove_space_from_groups(
		space_service: SpaceService,
		space_id: SpaceId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(space_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: has_space_id(x, space_id)) \
		.map(lambda x: remove_space_id_from_user_group(x, space_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def validate_topics(space_service: SpaceService, topic_ids: List[TopicId], tenant_id: TenantId) -> None:
	if topic_ids is None:
		return
	given_count = len(topic_ids)
	if given_count == 0:
		return
	topic_service = get_topic_service(space_service)
	existing_topic_ids = topic_service.find_ids_by_ids(topic_ids, tenant_id)
	if given_count != len(existing_topic_ids):
		raise_400('Topic ids do not match')


@router.post('/space', tags=[UserRole.ADMIN], response_model=Space)
async def save_space(
		space: Space, principal_service: PrincipalService = Depends(get_admin_principal)) -> Space:
	validate_tenant_id(space, principal_service)

	space_service = get_space_service(principal_service)

	def action(a_space: Space) -> Space:
		if space_service.is_storable_id_faked(a_space.spaceId):
			space_service.redress_storable_id(a_space)
			user_group_ids = ArrayHelper(a_space.groupIds).distinct().to_list()
			a_space.groupIds = user_group_ids
			topic_ids = ArrayHelper(a_space.topicIds).distinct().to_list()
			a_space.topicIds = topic_ids
			# check topics
			validate_topics(space_service, topic_ids, a_space.tenantId)
			# noinspection PyTypeChecker
			a_space: Space = space_service.create(a_space)
			# synchronize space to user groups
			sync_space_to_groups(space_service, a_space.spaceId, user_group_ids, a_space.tenantId)
		else:
			# noinspection PyTypeChecker,DuplicatedCode
			existing_space: Optional[Space] = space_service.find_by_id(a_space.spaceId)
			if existing_space is not None:
				if existing_space.tenantId != a_space.tenantId:
					raise_403()

			user_group_ids = ArrayHelper(a_space.groupIds).distinct().to_list()
			a_space.groupIds = user_group_ids
			topic_ids = ArrayHelper(a_space.topicIds).distinct().to_list()
			a_space.topicIds = topic_ids
			# check topics
			validate_topics(space_service, topic_ids, a_space.tenantId)
			# noinspection PyTypeChecker
			a_space: Space = space_service.update(a_space)
			# remove user from user groups, in case user groups are removed
			removed_user_group_ids = ArrayHelper(existing_space.groupIds).difference(user_group_ids).to_list()
			remove_space_from_groups(space_service, a_space.spaceId, removed_user_group_ids, a_space.tenantId)
			# synchronize user to user groups
			sync_space_to_groups(space_service, a_space.spaceId, user_group_ids, a_space.tenantId)
		return a_space

	return trans(space_service, lambda: action(space))


class QuerySpaceDataPage(DataPage):
	data: List[Space]


@router.post('/space/name', tags=[UserRole.ADMIN], response_model=QuerySpaceDataPage)
async def find_pageable_spaces_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QuerySpaceDataPage:
	space_service = get_space_service(principal_service)

	def action() -> QuerySpaceDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return space_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return space_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(space_service, action)


@router.get('/space/list/name', tags=[UserRole.ADMIN], response_model=List[Space])
async def find_spaces_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Space]:
	space_service = get_space_service(principal_service)

	def action() -> List[Space]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return space_service.find_by_text(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return space_service.find_by_text(query_name, tenant_id)

	return trans_readonly(space_service, action)


@router.post('/space/ids', tags=[UserRole.ADMIN], response_model=List[Space])
async def find_spaces_by_ids(
		space_ids: List[SpaceId], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Space]:
	if len(space_ids) == 0:
		return []

	space_service = get_space_service(principal_service)

	def action() -> List[Space]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return space_service.find_by_ids(space_ids, tenant_id)

	return trans_readonly(space_service, action)


@router.delete('/space', tags=[UserRole.SUPER_ADMIN], response_model=Space)
async def delete_space_by_id_by_super_admin(
		space_id: Optional[SpaceId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Space:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(space_id):
		raise_400('Space id is required.')

	space_service = get_space_service(principal_service)

	def action() -> Space:
		# noinspection PyTypeChecker
		space: Space = space_service.delete(space_id)
		if space is None:
			raise_404()
		return space

	return trans(space_service, action)
