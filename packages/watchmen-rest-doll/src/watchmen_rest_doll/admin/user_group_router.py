from abc import abstractmethod
from typing import Callable, List, Optional, Union

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService, UserGroupService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Space, User, UserGroup, UserRole
from watchmen_model.common import DataPage, IndicatorId, Pageable, SpaceId, TenantId, UserGroupId, UserId
from watchmen_rest import get_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
	return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(user_group_service: UserGroupService) -> UserService:
	return UserService(
		user_group_service.storage, user_group_service.snowflakeGenerator, user_group_service.principalService)


def get_space_service(user_group_service: UserGroupService) -> SpaceService:
	return SpaceService(
		user_group_service.storage, user_group_service.snowflakeGenerator, user_group_service.principalService)


@router.get('/user_group', tags=[UserRole.ADMIN], response_model=UserGroup)
async def load_user_group_by_id(
		user_group_id: Optional[UserGroupId] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> UserGroup:
	if is_blank(user_group_id):
		raise_400('User group id is required.')

	user_group_service = get_user_group_service(principal_service)

	def action() -> UserGroup:
		# noinspection PyTypeChecker
		user_group: UserGroup = user_group_service.find_by_id(user_group_id)
		if user_group is None:
			raise_404()
		# tenant id must match current principal's
		if user_group.tenantId != principal_service.get_tenant_id():
			raise_404()
		return user_group

	return trans_readonly(user_group_service, action)


def has_user_group_id(x: Union[User, Space], user_group_id: UserGroupId) -> bool:
	if x.groupIds is None:
		return False
	elif len(x.groupIds) == 0:
		return False
	else:
		return user_group_id in x.groupIds


def append_user_group_id(x: Union[User, Space], user_group_id: UserGroupId) -> Union[User, Space]:
	if x.groupIds is None:
		x.groupIds = [user_group_id]
	else:
		x.groupIds.append(user_group_id)
	return x


def update_user_or_space(service: Union[UserService, SpaceService], x: Union[User, Space]) -> None:
	service.update(x)


# noinspection DuplicatedCode
def sync_group(
		service: Union[UserService, SpaceService],
		user_group_id: UserGroupId, user_or_space_ids: Union[List[UserId], List[SpaceId]],
		tenant_id: TenantId,
		where: str
) -> None:
	if user_or_space_ids is None:
		return

	given_count = len(user_or_space_ids)
	if given_count == 0:
		# do nothing
		return

	holders = service.find_by_ids(user_or_space_ids, tenant_id)
	found_count = len(holders)
	if given_count != found_count:
		raise_400(f'{where} ids do not match.')

	ArrayHelper(holders) \
		.filter(lambda x: not has_user_group_id(x, user_group_id)) \
		.map(lambda x: append_user_group_id(x, user_group_id)) \
		.each(lambda x: update_user_or_space(service, x))


def remove_user_group_id(x: Union[User, Space], user_group_id: UserGroupId) -> Union[User, Space]:
	x.groupIds = ArrayHelper(x.groupIds).filter(lambda y: y != user_group_id).to_list()
	return x


# noinspection DuplicatedCode
def remove_user_group_from_holders(
		service: Union[UserService, SpaceService],
		user_group_id: UserGroupId, holder_ids: Union[List[UserId], List[SpaceId]],
		tenant_id: TenantId,
		where: str
) -> None:
	if holder_ids is None:
		return

	given_count = len(holder_ids)
	if given_count == 0:
		# do nothing
		return

	holders = service.find_by_ids(holder_ids, tenant_id)
	found_count = len(holders)
	if given_count != found_count:
		raise_400(f'{where} ids do not match.')

	ArrayHelper(holders) \
		.filter(lambda x: has_user_group_id(x, user_group_id)) \
		.map(lambda x: remove_user_group_id(x, user_group_id)) \
		.each(lambda x: update_user_or_space(service, x))


def remove_user_group_from_users(
		user_group_service: UserGroupService, user_group_id: UserGroupId, user_ids: List[UserId], tenant_id: TenantId
) -> None:
	remove_user_group_from_holders(
		get_user_service(user_group_service), user_group_id, user_ids, tenant_id, 'User')


def remove_user_group_from_spaces(
		user_group_service: UserGroupService, user_group_id: UserGroupId, space_ids: List[SpaceId], tenant_id: TenantId
) -> None:
	remove_user_group_from_holders(
		get_space_service(user_group_service), user_group_id, space_ids, tenant_id, 'Space')


class SyncUserGroupChangeWithIndicator:
	@abstractmethod
	def sync_on_create(
			self, user_group_id: UserGroupId, indicator_ids: Optional[List[IndicatorId]],
			tenant_id: TenantId, user_group_service: UserGroupService):
		raise NotImplementedError()

	@abstractmethod
	def sync_on_update(
			self, user_group_id: UserGroupId, indicator_ids: Optional[List[IndicatorId]],
			removed_indicator_ids: Optional[List[IndicatorId]],
			tenant_id: TenantId, user_group_service: UserGroupService):
		raise NotImplementedError()


class SyncUserGroupChange:
	def __init__(self):
		self.indicator_handler = None

	def register_indicator_handler(self, handler: SyncUserGroupChangeWithIndicator) -> None:
		self.indicator_handler = handler

	def has_indicator_handler(self) -> bool:
		return self.indicator_handler is not None

	def ask_indicator_handler(self) -> Optional[SyncUserGroupChangeWithIndicator]:
		return self.indicator_handler


sync_user_group_change = SyncUserGroupChange()


# noinspection PyUnusedLocal
def ask_save_user_group_action(
		user_group_service: UserGroupService, principal_service: PrincipalService) -> Callable[[UserGroup], UserGroup]:
	def action(user_group: UserGroup) -> UserGroup:
		if user_group_service.is_storable_id_faked(user_group.userGroupId):
			user_group_service.redress_storable_id(user_group)
			user_ids = ArrayHelper(user_group.userIds).distinct().to_list()
			user_group.userIds = user_ids
			space_ids = ArrayHelper(user_group.spaceIds).distinct().to_list()
			user_group.spaceIds = space_ids
			# noinspection PyTypeChecker
			user_group: UserGroup = user_group_service.create(user_group)
			# synchronize user group to user
			sync_group(
				get_user_service(user_group_service), user_group.userGroupId, user_ids, user_group.tenantId, 'User')
			# synchronize user group to space
			sync_group(
				get_space_service(user_group_service), user_group.userGroupId, space_ids, user_group.tenantId,
				'Space')

			if sync_user_group_change.has_indicator_handler():
				indicator_ids = ArrayHelper(user_group.indicatorIds).distinct().to_list()
				sync_user_group_change.ask_indicator_handler().sync_on_create(
					user_group.userGroupId, indicator_ids, user_group.tenantId, user_group_service)
		else:
			# noinspection PyTypeChecker,DuplicatedCode
			existing_user_group: Optional[UserGroup] = user_group_service.find_by_id(user_group.userGroupId)
			if existing_user_group is not None:
				if existing_user_group.tenantId != user_group.tenantId:
					raise_403()

			user_ids = ArrayHelper(user_group.userIds).distinct().to_list()
			user_group.userIds = user_ids
			space_ids = ArrayHelper(user_group.spaceIds).distinct().to_list()
			user_group.spaceIds = space_ids
			# noinspection PyTypeChecker
			user_group: UserGroup = user_group_service.update(user_group)
			# remove user group from users, in case users are removed
			removed_user_ids = ArrayHelper(existing_user_group.userIds).difference(user_ids).to_list()
			remove_user_group_from_users(
				user_group_service, user_group.userGroupId, removed_user_ids, user_group.tenantId)
			# synchronize user group to user
			sync_group(
				get_user_service(user_group_service), user_group.userGroupId, user_ids, user_group.tenantId, 'User')
			# remove user group from spaces, in case spaces are removed
			removed_space_ids = ArrayHelper(existing_user_group.spaceIds).difference(space_ids).to_list()
			remove_user_group_from_spaces(
				user_group_service, user_group.userGroupId, removed_space_ids, user_group.tenantId)
			# synchronize user group to space
			sync_group(
				get_space_service(user_group_service), user_group.userGroupId, space_ids, user_group.tenantId,
				'Space')

			if sync_user_group_change.has_indicator_handler():
				indicator_ids = ArrayHelper(user_group.indicatorIds).distinct().to_list()
				removed_indicator_ids = ArrayHelper(existing_user_group.indicatorIds) \
					.difference(indicator_ids).to_list()
				sync_user_group_change.ask_indicator_handler().sync_on_update(
					user_group.userGroupId, indicator_ids, removed_indicator_ids, user_group.tenantId,
					user_group_service)

		return user_group

	return action


@router.post('/user_group', tags=[UserRole.ADMIN], response_model=UserGroup)
async def save_user_group(
		user_group: UserGroup, principal_service: PrincipalService = Depends(get_admin_principal)) -> UserGroup:
	validate_tenant_id(user_group, principal_service)
	user_group_service = get_user_group_service(principal_service)
	action = ask_save_user_group_action(user_group_service, principal_service)
	return trans(user_group_service, lambda: action(user_group))


class QueryUserGroupDataPage(DataPage):
	data: List[UserGroup]


@router.post('/user_group/name', tags=[UserRole.ADMIN], response_model=QueryUserGroupDataPage)
async def find_user_groups_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> QueryUserGroupDataPage:
	user_group_service = get_user_group_service(principal_service)

	def action() -> QueryUserGroupDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return user_group_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return user_group_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(user_group_service, action)


@router.get('/user_group/list/name', tags=[UserRole.ADMIN], response_model=List[UserGroup])
async def find_user_groups_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[UserGroup]:
	user_group_service = get_user_group_service(principal_service)

	def action() -> List[UserGroup]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return user_group_service.find_by_name(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return user_group_service.find_by_name(query_name, tenant_id)

	return trans_readonly(user_group_service, action)


@router.post('/user_group/ids', tags=[UserRole.ADMIN], response_model=List[UserGroup])
async def find_user_groups_by_ids(
		user_group_ids: List[UserGroupId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[UserGroup]:
	if len(user_group_ids) == 0:
		return []

	user_group_service = get_user_group_service(principal_service)

	def action() -> List[UserGroup]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return user_group_service.find_by_ids(user_group_ids, tenant_id)

	return trans_readonly(user_group_service, action)


@router.delete('/user_group', tags=[UserRole.SUPER_ADMIN], response_model=UserGroup)
async def delete_user_group_by_id_by_super_admin(
		user_group_id: Optional[UserGroupId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> UserGroup:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(user_group_id):
		raise_400('User group id is required.')

	user_group_service = get_user_group_service(principal_service)

	def action() -> UserGroup:
		# noinspection PyTypeChecker
		user_group: UserGroup = user_group_service.delete(user_group_id)
		if user_group is None:
			raise_404()
		space_ids = user_group.spaceIds
		if space_ids is not None and len(space_ids) != 0:
			space_ids = ArrayHelper(space_ids).filter(lambda x: is_not_blank(x)).to_list()
			if len(space_ids) != 0:
				remove_user_group_from_spaces(
					user_group_service, user_group.userGroupId, space_ids, user_group.tenantId)
		user_ids = user_group.userIds
		if user_ids is not None and len(user_ids) != 0:
			user_ids = ArrayHelper(user_ids).filter(lambda x: is_not_blank(x)).to_list()
			if len(user_ids) != 0:
				remove_user_group_from_users(
					user_group_service, user_group.userGroupId, user_ids, user_group.tenantId)
		return user_group

	return trans(user_group_service, action)
