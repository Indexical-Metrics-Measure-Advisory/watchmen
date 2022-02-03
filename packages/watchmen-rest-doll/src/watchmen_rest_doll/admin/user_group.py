from typing import List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import SpaceService, UserGroupService, UserService
from watchmen_model.admin import Space, User, UserGroup, UserRole
from watchmen_model.common import DataPage, Pageable, SpaceId, TenantId, UserGroupId, UserId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, validate_tenant_id
from watchmen_utilities import ArrayHelper

router = APIRouter()


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
	return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(user_group_service: UserGroupService) -> UserService:
	return UserService(
		user_group_service.storage, user_group_service.snowflake_generator, user_group_service.principal_service)


def get_space_service(user_group_service: UserGroupService) -> SpaceService:
	return SpaceService(
		user_group_service.storage, user_group_service.snowflake_generator, user_group_service.principal_service)


@router.get('/user_group', tags=[UserRole.ADMIN], response_model=UserGroup)
async def load_user_group_by_id(
		user_group_id: Optional[UserGroupId] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> UserGroup:
	if is_blank(user_group_id):
		raise_400('User group id is required.')

	user_group_service = get_user_group_service(principal_service)
	user_group_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		user_group: UserGroup = user_group_service.find_by_id(user_group_id)
		# tenant id must match current principal's
		if user_group.tenantId != principal_service.get_tenant_id():
			raise_404()
		return user_group
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		user_group_service.close_transaction()


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

	users = service.find_by_ids(user_or_space_ids, tenant_id)
	found_count = len(users)
	if given_count != found_count:
		raise_400(f'{where} ids does not match.')

	ArrayHelper(users) \
		.filter(lambda x: not has_user_group_id(x, user_group_id)) \
		.map(lambda x: append_user_group_id(x, user_group_id)) \
		.each(lambda x: update_user_or_space(service, x))


def remove_user_group_id(x: Union[User, Space], user_group_id: UserGroupId) -> Union[User, Space]:
	x.groupIds = ArrayHelper(x.groupIds).filter(lambda y: y != user_group_id).to_list()
	return x


def remove_group(
		service: Union[UserService, SpaceService],
		user_group_id: UserId, user_or_space_ids: Union[List[UserId], List[SpaceId]],
		tenant_id: TenantId,
		where: str
) -> None:
	if user_or_space_ids is None:
		return

	given_count = len(user_or_space_ids)
	if given_count == 0:
		# do nothing
		return

	users = service.find_by_ids(user_or_space_ids, tenant_id)
	found_count = len(users)
	if given_count != found_count:
		raise_400(f'{where} ids does not match.')

	ArrayHelper(users) \
		.filter(lambda x: has_user_group_id(x, user_group_id)) \
		.map(lambda x: remove_user_group_id(x, user_group_id)) \
		.each(lambda x: update_user_or_space(service, x))


# def is_user_has_user_group_id(user: User, user_group_id: UserGroupId) -> bool:
# 	if user.groupIds is None:
# 		return False
# 	elif len(user.groupIds) == 0:
# 		return False
# 	else:
# 		return user_group_id in user.groupIds


# def append_user_group_id_to_user(user: User, user_group_id: UserGroupId) -> User:
# 	if user.groupIds is None:
# 		user.groupIds = [user_group_id]
# 	else:
# 		user.groupIds.append(user_group_id)
# 	return user


# def update_user(user_service: UserService, user: User) -> None:
# 	user_service.update(user)


# def sync_group_to_users(
# 		user_group_service: UserGroupService,
# 		user_group_id: UserGroupId, user_ids: List[UserId],
# 		tenant_id: TenantId
# ) -> None:
# 	if user_ids is None:
# 		return
#
# 	given_count = len(user_ids)
# 	if given_count == 0:
# 		# do nothing
# 		return
#
# 	user_service = get_user_service(user_group_service)
# 	users = user_service.find_by_ids(user_ids, tenant_id)
# 	found_count = len(users)
# 	if given_count != found_count:
# 		raise_400(f'User ids does not match.')
#
# 	ArrayHelper(users) \
# 		.filter(lambda x: not has_user_group_id(x, user_group_id)) \
# 		.map(lambda x: append_user_group_id(x, user_group_id)) \
# 		.each(lambda x: update_user_or_space(user_service, x))


# def remove_user_group_id_from_user(user: User, user_group_id: UserGroupId) -> User:
# 	user.groupIds = ArrayHelper(user.groupIds).filter(lambda x: x != user_group_id).to_list()
# 	return user


# def remove_group_from_users(
# 		user_group_service: UserGroupService,
# 		user_group_id: UserId, user_ids: List[UserId],
# 		tenant_id: TenantId
# ) -> None:
# 	if user_ids is None:
# 		return
#
# 	given_count = len(user_ids)
# 	if given_count == 0:
# 		# do nothing
# 		return
#
# 	user_service = get_user_service(user_group_service)
# 	users = user_service.find_by_ids(user_ids, tenant_id)
# 	found_count = len(users)
# 	if given_count != found_count:
# 		raise_400(f'User ids does not match.')
#
# 	ArrayHelper(users) \
# 		.filter(lambda x: has_user_group_id(x, user_group_id)) \
# 		.map(lambda x: remove_user_group_id_from_user(x, user_group_id)) \
# 		.each(lambda x: update_user_or_space(user_service, x))


# def is_space_has_user_group_id(space: Space, user_group_id: UserGroupId) -> bool:
# 	if space.groupIds is None:
# 		return False
# 	elif len(space.groupIds) == 0:
# 		return False
# 	else:
# 		return user_group_id in space.groupIds


# def append_user_group_id_to_space(space: Space, user_group_id: UserGroupId) -> Space:
# 	if space.groupIds is None:
# 		space.groupIds = [user_group_id]
# 	else:
# 		space.groupIds.append(user_group_id)
# 	return space


# def update_space(space_service: SpaceService, space: Space) -> None:
# 	space_service.update(space)


# def sync_group_to_spaces(
# 		user_group_service: UserGroupService,
# 		user_group_id: UserGroupId, space_ids: List[SpaceId],
# 		tenant_id: TenantId
# ) -> None:
# 	if space_ids is None:
# 		return
#
# 	given_count = len(space_ids)
# 	if given_count == 0:
# 		# do nothing
# 		return
#
# 	space_service = get_space_service(user_group_service)
# 	spaces = space_service.find_by_ids(space_ids, tenant_id)
# 	found_count = len(spaces)
# 	if given_count != found_count:
# 		raise_400(f'Space ids does not match.')
#
# 	ArrayHelper(spaces) \
# 		.filter(lambda x: not is_space_has_user_group_id(x, user_group_id)) \
# 		.map(lambda x: append_user_group_id_to_space(x, user_group_id)) \
# 		.each(lambda x: update_space(space_service, x))


# def remove_user_group_id_from_space(space: Space, user_group_id: UserGroupId) -> Space:
# 	space.groupIds = ArrayHelper(space.groupIds).filter(lambda x: x != user_group_id).to_list()
# 	return space


# def remove_group_from_spaces(
# 		user_group_service: UserGroupService,
# 		user_group_id: UserId, user_ids: List[UserId],
# 		tenant_id: TenantId
# ) -> None:
# 	if user_ids is None:
# 		return
#
# 	given_count = len(user_ids)
# 	if given_count == 0:
# 		# do nothing
# 		return
#
# 	space_service = get_space_service(user_group_service)
# 	spaces = space_service.find_by_ids(user_ids, tenant_id)
# 	found_count = len(spaces)
# 	if given_count != found_count:
# 		raise_400(f'Space ids does not match.')
#
# 	ArrayHelper(spaces) \
# 		.filter(lambda x: is_space_has_user_group_id(x, user_group_id)) \
# 		.map(lambda x: remove_user_group_id_from_space(x, user_group_id)) \
# 		.each(lambda x: update_space(space_service, x))


@router.post('/user_group', tags=[UserRole.ADMIN], response_model=UserGroup)
async def save_user_group(
		user_group: UserGroup, principal_service: PrincipalService = Depends(get_admin_principal)) -> UserGroup:
	validate_tenant_id(user_group, principal_service)

	user_group_service = get_user_group_service(principal_service)

	if user_group_service.is_tuple_id_faked(user_group.userGroupId):
		user_group_service.begin_transaction()
		try:
			user_group_service.redress_tuple_id(user_group)
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
				get_space_service(user_group_service), user_group.userGroupId, space_ids, user_group.tenantId, 'Space')
			user_group_service.commit_transaction()
		except Exception as e:
			user_group_service.rollback_transaction()
			raise_500(e)
	else:
		user_group_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
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
			remove_group(
				get_user_service(user_group_service),
				user_group.userGroupId, removed_user_ids, user_group.tenantId, 'User')
			# synchronize user group to user
			sync_group(
				get_user_service(user_group_service), user_group.userGroupId, user_ids, user_group.tenantId, 'User')
			# remove user group from spaces, in case spaces are removed
			removed_space_ids = ArrayHelper(existing_user_group.spaceIds).difference(space_ids).to_list()
			remove_group(
				get_space_service(user_group_service),
				user_group.userGroupId, removed_space_ids, user_group.tenantId, 'Space')
			# synchronize user group to space
			sync_group(
				get_space_service(user_group_service), user_group.userGroupId, space_ids, user_group.tenantId, 'Space')
			user_group_service.commit_transaction()
		except HTTPException as e:
			raise e
		except Exception as e:
			user_group_service.rollback_transaction()
			raise_500(e)

	return user_group


@router.post('/user_group/name', tags=[UserRole.ADMIN], response_model=DataPage)
async def find_user_groups_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataPage:
	tenant_id: TenantId = principal_service.get_tenant_id()
	if is_blank(query_name):
		query_name = None

	user_group_service = get_user_group_service(principal_service)
	user_group_service.begin_transaction()
	try:
		return user_group_service.find_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		user_group_service.close_transaction()


@router.post('/user_group/ids', tags=[UserRole.ADMIN], response_model=List[UserGroup])
async def find_user_groups_by_ids(
		user_group_ids: List[UserGroupId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[UserGroup]:
	if len(user_group_ids) == 0:
		return []

	tenant_id: TenantId = principal_service.get_tenant_id()

	user_group_service = get_user_group_service(principal_service)
	user_group_service.begin_transaction()
	try:
		return user_group_service.find_by_ids(user_group_ids, tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		user_group_service.close_transaction()
