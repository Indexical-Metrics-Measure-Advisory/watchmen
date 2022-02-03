from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import SpaceService, TopicService, UserGroupService
from watchmen_model.admin import Space, UserGroup, UserRole
from watchmen_model.common import DataPage, Pageable, SpaceId, TenantId, TopicId, UserGroupId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, validate_tenant_id
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
		space_id: Optional[SpaceId] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Space:
	if is_blank(space_id):
		raise_400('Space id is required.')

	space_service = get_space_service(principal_service)
	space_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		space: Space = space_service.find_by_id(space_id)
		# tenant id must match current principal's
		if space.tenantId != principal_service.get_tenant_id():
			raise_404()
		return space
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		space_service.close_transaction()


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
async def save_user_group(
		space: Space, principal_service: PrincipalService = Depends(get_admin_principal)) -> Space:
	validate_tenant_id(space, principal_service)

	space_service = get_space_service(principal_service)

	if space_service.is_tuple_id_faked(space.spaceId):
		space_service.begin_transaction()
		try:
			space_service.redress_tuple_id(space)
			user_group_ids = ArrayHelper(space.groupIds).distinct().to_list()
			space.groupIds = user_group_ids
			topic_ids = ArrayHelper(space.topicIds).distinct().to_list()
			space.topicIds = topic_ids
			# check topics
			validate_topics(space_service, topic_ids, space.tenantId)
			# noinspection PyTypeChecker
			space: Space = space_service.create(space)
			# synchronize space to user groups
			sync_space_to_groups(space_service, space.spaceId, user_group_ids, space.tenantId)
			space_service.commit_transaction()
		except HTTPException as e:
			space_service.rollback_transaction()
			raise e
		except Exception as e:
			space_service.rollback_transaction()
			raise_500(e)
	else:
		space_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_space: Optional[Space] = space_service.find_by_id(space.spaceId)
			if existing_space is not None:
				if existing_space.tenantId != space.tenantId:
					raise_403()

			user_group_ids = ArrayHelper(space.groupIds).distinct().to_list()
			space.groupIds = user_group_ids
			topic_ids = ArrayHelper(space.topicIds).distinct().to_list()
			space.topicIds = topic_ids
			# check topics
			validate_topics(space_service, topic_ids, space.tenantId)
			# noinspection PyTypeChecker
			space: Space = space_service.update(space)
			# remove user from user groups, in case user groups are removed
			removed_user_group_ids = ArrayHelper(existing_space.groupIds).difference(user_group_ids).to_list()
			remove_space_from_groups(space_service, space.spaceId, removed_user_group_ids, space.tenantId)
			# synchronize user to user groups
			sync_space_to_groups(space_service, space.spaceId, user_group_ids, space.tenantId)
			space_service.commit_transaction()
		except HTTPException as e:
			space_service.rollback_transaction()
			raise e
		except Exception as e:
			space_service.rollback_transaction()
			raise_500(e)

	return space


@router.post('/space/name', tags=[UserRole.ADMIN], response_model=DataPage)
async def find_user_groups_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataPage:
	tenant_id: TenantId = principal_service.get_tenant_id()
	if is_blank(query_name):
		query_name = None

	space_service = get_space_service(principal_service)
	space_service.begin_transaction()
	try:
		return space_service.find_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		space_service.close_transaction()


@router.post('/space/ids', tags=[UserRole.ADMIN], response_model=List[Space])
async def find_user_groups_by_ids(
		space_ids: List[SpaceId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Space]:
	if len(space_ids) == 0:
		return []

	tenant_id: TenantId = principal_service.get_tenant_id()

	user_group_service = get_space_service(principal_service)
	user_group_service.begin_transaction()
	try:
		return user_group_service.find_by_ids(space_ids, tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		user_group_service.close_transaction()
