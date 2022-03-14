from typing import Callable, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserGroupService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User, UserGroup, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, UserGroupId, UserId
from watchmen_rest import get_admin_principal, get_any_admin_principal, get_any_principal, \
	get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import crypt_password, trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_group_service(user_service: UserService) -> UserGroupService:
	return UserGroupService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def clear_pwd(user: User):
	del user.password


@router.get('/user', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def load_user_by_id(
		user_id: Optional[UserId] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> User:
	if is_blank(user_id):
		raise_400('User id is required.')
	if not principal_service.is_admin():
		# console user cannot visit other users
		if user_id != principal_service.get_user_id():
			raise_403()

	user_service = get_user_service(principal_service)

	def action() -> User:
		# noinspection PyTypeChecker
		user: User = user_service.find_by_id(user_id)
		if user is None:
			raise_404()
		# check tenant id
		if not principal_service.is_super_admin():
			# tenant id must match current principal's, except current is super admin
			if user.tenantId != principal_service.get_tenant_id():
				raise_404()
		# remove password
		clear_pwd(user)
		return user

	return trans_readonly(user_service, action)


# noinspection DuplicatedCode
def has_user_id(user_group: UserGroup, user_id: UserId) -> bool:
	if user_group.userIds is None:
		return False
	elif len(user_group.userIds) == 0:
		return False
	else:
		return user_id in user_group.userIds


def append_user_id_to_user_group(user_group: UserGroup, user_id: UserId) -> UserGroup:
	if user_group.userIds is None:
		user_group.userIds = [user_id]
	else:
		user_group.userIds.append(user_id)
	return user_group


def update_user_group(user_group_service: UserGroupService, user_group: UserGroup) -> None:
	user_group_service.update(user_group)


# noinspection DuplicatedCode
def sync_user_to_groups(
		user_service: UserService,
		user_id: UserId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(user_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: not has_user_id(x, user_id)) \
		.map(lambda x: append_user_id_to_user_group(x, user_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def remove_user_id_from_user_group(user_group: UserGroup, user_id: UserId) -> UserGroup:
	user_group.userIds = ArrayHelper(user_group.userIds).filter(lambda x: x != user_id).to_list()
	return user_group


# noinspection DuplicatedCode
def remove_user_from_groups(
		user_service: UserService, user_id: UserId, user_group_ids: List[UserGroupId], tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(user_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: has_user_id(x, user_id)) \
		.map(lambda x: remove_user_id_from_user_group(x, user_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def ask_save_user_action(
		user_service: UserService, principal_service: PrincipalService, check_user_group: bool = True
) -> Callable[[User], User]:
	def action(user: User) -> User:
		# crypt password
		pwd = user.password
		if is_not_blank(pwd):
			user.password = crypt_password(pwd)

		if user.isActive is None:
			user.isActive = True

		if user_service.is_storable_id_faked(user.userId):
			if principal_service.is_super_admin() and check_user_group:
				if user.groupIds is not None and len(user.groupIds) != 0:
					# for super admin create user, there is no user group allowed
					raise_400('No user group allowed for creating user by super admin.')
			user_service.redress_storable_id(user)
			user_group_ids = ArrayHelper(user.groupIds).distinct().to_list()
			user.groupIds = user_group_ids
			# noinspection PyTypeChecker
			user: User = user_service.create(user)
			# synchronize user to user groups
			sync_user_to_groups(user_service, user.userId, user_group_ids, user.tenantId)
		else:
			# noinspection PyTypeChecker
			existing_user: Optional[User] = user_service.find_by_id(user.userId)
			if existing_user is not None:
				if existing_user.tenantId != user.tenantId:
					raise_403()
				elif is_blank(user.password):
					# keep original password
					user.password = existing_user.password

			if principal_service.is_super_admin() and check_user_group:
				# for super admin update user, simply keep user group
				user.groupIds = existing_user.groupIds
			else:
				user_group_ids = ArrayHelper(user.groupIds).distinct().to_list()
				user.groupIds = user_group_ids
			user_group_ids = user.groupIds
			# noinspection PyTypeChecker
			user: User = user_service.update(user)

			if principal_service.is_tenant_admin():
				# remove user from user groups, in case user groups are removed
				removed_user_group_ids = ArrayHelper(existing_user.groupIds).difference(user_group_ids).to_list()
				remove_user_from_groups(user_service, user.userId, removed_user_group_ids, user.tenantId)
				# synchronize user to user groups
				sync_user_to_groups(user_service, user.userId, user_group_ids, user.tenantId)

		# remove password
		clear_pwd(user)
		return user

	return action


@router.post('/user', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def save_user(user: User, principal_service: PrincipalService = Depends(get_any_admin_principal)) -> User:
	validate_tenant_id(user, principal_service)
	user_service = get_user_service(principal_service)
	action = ask_save_user_action(user_service, principal_service)
	return trans(user_service, lambda: action(user))


class QueryUserDataPage(DataPage):
	data: List[User]


@router.post('/user/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=QueryUserDataPage)
async def find_users_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryUserDataPage:
	user_service = get_user_service(principal_service)

	def action() -> QueryUserDataPage:
		tenant_id: Optional[TenantId] = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		if is_blank(query_name):
			page = user_service.find_page_by_text(None, tenant_id, pageable)
		else:
			page = user_service.find_page_by_text(query_name, tenant_id, pageable)

		ArrayHelper(page.data).each(clear_pwd)
		# noinspection PyTypeChecker
		return page

	return trans_readonly(user_service, action)


@router.get('/user/list/name', tags=[UserRole.ADMIN], response_model=List[User])
async def find_users_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[User]:
	user_service = get_user_service(principal_service)

	def action() -> List[User]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			users = user_service.find_by_name(None, tenant_id)
		else:
			users = user_service.find_by_name(query_name, tenant_id)

		ArrayHelper(users).each(clear_pwd)
		# noinspection PyTypeChecker
		return users

	return trans_readonly(user_service, action)


@router.post('/user/ids', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[User])
async def find_users_by_ids(
		user_ids: List[UserId], principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[User]:
	if len(user_ids) == 0:
		return []

	user_service = get_user_service(principal_service)

	def action() -> List[User]:
		tenant_id: Optional[TenantId] = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		users = user_service.find_by_ids(user_ids, tenant_id)
		ArrayHelper(users).each(clear_pwd)
		return users

	return trans_readonly(user_service, action)


@router.delete('/user', tags=[UserRole.SUPER_ADMIN], response_model=User)
async def delete_user_by_id_by_super_admin(
		user_id: Optional[UserId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> User:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(user_id):
		raise_400('User id is required.')

	user_service = get_user_service(principal_service)

	def action() -> User:
		# noinspection PyTypeChecker
		user: User = user_service.delete(user_id)
		if user is None:
			raise_404()
		user_group_ids = user.groupIds
		if user_group_ids is not None and len(user_group_ids) != 0:
			user_group_ids = ArrayHelper(user_group_ids).filter(lambda x: is_not_blank(x)).to_list()
			remove_user_from_groups(user_service, user.userId, user_group_ids, user.tenantId)
		return user

	return trans(user_service, action)
