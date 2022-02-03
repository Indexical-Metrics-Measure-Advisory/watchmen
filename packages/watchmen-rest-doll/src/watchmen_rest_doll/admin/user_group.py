from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import UserGroupService
from watchmen_model.admin import UserGroup, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, UserGroupId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, validate_tenant_id

router = APIRouter()


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
	return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


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


@router.post('/user_group', tags=[UserRole.ADMIN], response_model=UserGroup)
async def save_user_group(
		user_group: UserGroup, principal_service: PrincipalService = Depends(get_admin_principal)) -> UserGroup:
	validate_tenant_id(user_group, principal_service)

	user_group_service = get_user_group_service(principal_service)

	if user_group_service.is_tuple_id_faked(user_group.userGroupId):
		user_group_service.begin_transaction()
		try:
			user_group_service.redress_tuple_id(user_group)
			# noinspection PyTypeChecker
			user_group: UserGroup = user_group_service.create(user_group)
			# TODO synchronize user group to user
			# TODO synchronize user group to space
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

			# noinspection PyTypeChecker
			user_group: UserGroup = user_group_service.update(user_group)
			# TODO synchronize user group to user
			# TODO synchronize user group to space
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
