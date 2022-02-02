from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import UserService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_any_admin_principal, get_any_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import crypt_password, is_blank, is_not_blank, validate_tenant_id
from watchmen_utilities import ArrayHelper

router = APIRouter()


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def clear_pwd(user: User):
	user.password = None


@router.get('/user', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def load_user(
		user_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> User:
	if is_blank(user_id):
		raise_400('User id is required.')
	if not principal_service.is_admin():
		# console user cannot visit other users
		if user_id != principal_service.get_user_id():
			raise_403()

	user_service = get_user_service(principal_service)
	user_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		user: User = user_service.find_by_id(user_id)
		# check tenant id
		if not principal_service.is_super_admin():
			# tenant id must match current principal's, except current is super admin
			if user.tenantId != principal_service.get_tenant_id():
				raise_404()
		# remove password
		clear_pwd(user)
		return user
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		user_service.close_transaction()


@router.post('/user', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def save_user(user: User, principal_service: PrincipalService = Depends(get_any_admin_principal)) -> User:
	validate_tenant_id(user, principal_service)

	# crypt password
	pwd = user.password
	if is_not_blank(pwd):
		user.password = crypt_password(pwd)

	user_service = get_user_service(principal_service)

	if user_service.is_tuple_id_faked(user.userId):
		user_service.begin_transaction()
		try:
			user_service.redress_tuple_id(user)
			# noinspection PyTypeChecker
			user: User = user_service.create(user)
			# TODO synchronize user to user group
			user_service.commit_transaction()
		except Exception as e:
			user_service.rollback_transaction()
			raise_500(e)
	else:
		user_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_user: Optional[User] = user_service.find_by_id(user.userId)
			if existing_user is not None:
				if existing_user.tenantId != user.tenantId:
					raise_403()
				elif is_blank(user.password):
					# keep original password
					user.password = existing_user.password

			# noinspection PyTypeChecker
			user: User = user_service.update(user)
			# TODO synchronize user to user group
			user_service.commit_transaction()
		except HTTPException as e:
			raise e
		except Exception as e:
			user_service.rollback_transaction()
			raise_500(e)

	# remove password
	clear_pwd(user)
	return user


@router.post('/user/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataPage)
async def find_users_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	tenant_id: Optional[TenantId] = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()
	if is_blank(query_name):
		query_name = None

	user_service = get_user_service(principal_service)
	user_service.begin_transaction()
	try:
		page = user_service.find_users_by_text(query_name, tenant_id, pageable)

		ArrayHelper(page.data).each(clear_pwd)
		return page
	except Exception as e:
		raise_500(e)
	finally:
		user_service.close_transaction()


# return query_users_by_name_with_pagination(query_name, pagination, current_user)

@router.post('/user/ids', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[User])
async def query_user_list_by_ids(
		user_ids: List[str], principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[User]:
	if len(user_ids) == 0:
		return []

	tenant_id: Optional[TenantId] = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	user_service = get_user_service(principal_service)
	user_service.begin_transaction()
	try:
		users = user_service.find_by_ids(user_ids, tenant_id)
		ArrayHelper(users).each(clear_pwd)
		return users
	except Exception as e:
		raise_500(e)
	finally:
		user_service.close_transaction()
