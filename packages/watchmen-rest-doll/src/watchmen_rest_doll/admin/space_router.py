from typing import Callable, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService, TopicService, UserGroupService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Space, User, UserGroup, UserRole
from watchmen_model.common import DataPage, Pageable, SpaceId, TenantId, TopicId, UserGroupId
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_space_service(principal_service: PrincipalService) -> SpaceService:
	return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(space_service: SpaceService) -> UserService:
	return UserService(
		space_service.storage, space_service.snowflakeGenerator, space_service.principalService)


def get_user_group_service(space_service: SpaceService) -> UserGroupService:
	return UserGroupService(space_service.storage, space_service.snowflakeGenerator, space_service.principalService)


def get_topic_service(space_service: SpaceService) -> TopicService:
	return TopicService(space_service.storage, space_service.snowflakeGenerator, space_service.principalService)


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


# noinspection DuplicatedCode
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


# noinspection PyUnusedLocal
def ask_save_space_action(space_service: SpaceService, principal_service: PrincipalService) -> Callable[[Space], Space]:
	def action(space: Space) -> Space:
		if space_service.is_storable_id_faked(space.spaceId):
			space_service.redress_storable_id(space)
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
		else:
			# noinspection PyTypeChecker,DuplicatedCode
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
			# remove space from user groups, in case user groups are removed
			removed_user_group_ids = ArrayHelper(existing_space.groupIds).difference(user_group_ids).to_list()
			remove_space_from_groups(space_service, space.spaceId, removed_user_group_ids, space.tenantId)
			# synchronize space to user groups
			sync_space_to_groups(space_service, space.spaceId, user_group_ids, space.tenantId)
		return space

	return action


@router.post('/space', tags=[UserRole.ADMIN], response_model=Space)
async def save_space(
		space: Space, principal_service: PrincipalService = Depends(get_admin_principal)) -> Space:
	validate_tenant_id(space, principal_service)
	space_service = get_space_service(principal_service)
	action = ask_save_space_action(space_service, principal_service)
	return trans(space_service, lambda: action(space))


class QuerySpaceDataPage(DataPage):
	data: List[Space]


@router.post('/space/name', tags=[UserRole.ADMIN], response_model=QuerySpaceDataPage)
async def find_spaces_page_by_name(
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
			return space_service.find_by_name(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return space_service.find_by_name(query_name, tenant_id)

	return trans_readonly(space_service, action)


@router.get('/space/available', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Space])
async def find_available_spaces(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Space]:
	space_service = get_space_service(principal_service)

	def action() -> List[Space]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		user_id = principal_service.get_user_id()
		# noinspection PyTypeChecker
		user: User = get_user_service(space_service).find_by_id(user_id)
		user_group_ids = user.groupIds
		if user_group_ids is None or len(user_group_ids) == 0:
			return []
		user_group_ids = ArrayHelper(user_group_ids).filter(lambda x: is_not_blank(x)).to_list()
		if len(user_group_ids) == 0:
			return []
		user_group_service = get_user_group_service(space_service)
		user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)

		def gather_space_ids(distinct_space_ids: List[SpaceId], user_group: UserGroup) -> List[SpaceId]:
			given_space_ids = user_group.spaceIds
			if given_space_ids is None or len(given_space_ids) == 0:
				return distinct_space_ids
			given_space_ids = ArrayHelper(given_space_ids).filter(lambda x: is_not_blank(x)).to_list()
			for space_id in given_space_ids:
				if space_id not in distinct_space_ids:
					distinct_space_ids.append(space_id)
			return distinct_space_ids

		space_ids = ArrayHelper(user_groups).reduce(gather_space_ids, [])
		return space_service.find_by_ids(space_ids, tenant_id)

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


@router.get('/space/export', tags=[UserRole.ADMIN], response_model=List[Space])
async def find_spaces_for_export(principal_service: PrincipalService = Depends(get_admin_principal)):
	space_service = get_space_service(principal_service)

	def action() -> List[Space]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return space_service.find_all(tenant_id)

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
		user_group_ids = space.groupIds
		if user_group_ids is not None and len(user_group_ids) != 0:
			user_group_ids = ArrayHelper(user_group_ids).filter(lambda x: is_not_blank(x)).to_list()
			remove_space_from_groups(space_service, space.spaceId, user_group_ids, space.tenantId)
		return space

	return trans(space_service, action)
