from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserService
from watchmen_meta.common import StorageService
from watchmen_meta.system import TenantService
from watchmen_model.admin import User
from watchmen_model.common import UserBasedTuple
from watchmen_model.system import Tenant
from watchmen_rest.util import raise_400, raise_403
from watchmen_utilities import ArrayHelper, is_blank


def get_user_service(storage_service: StorageService) -> UserService:
	return UserService(storage_service.storage, storage_service.snowflake_generator, storage_service.principal_service)


def get_tenant_service(user_service: UserService) -> TenantService:
	return TenantService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def validate_user(
		a_tuple: UserBasedTuple,
		user_service: UserService, principal_service: PrincipalService) -> None:
	if not principal_service.is_admin():
		raise_403()

	if is_blank(a_tuple.tenantId):
		if principal_service.is_super_admin():
			raise_400('Tenant id is required.')
		elif principal_service.is_tenant_admin():
			a_tuple.tenantId = principal_service.get_tenant_id()
	else:
		if principal_service.is_tenant_admin():
			if a_tuple.tenantId != principal_service.get_tenant_id():
				raise_403()
		elif principal_service.is_super_admin():
			tenant_service = get_tenant_service(user_service)
			tenant: Optional[Tenant] = tenant_service.find_by_id(a_tuple.tenantId)
			if tenant is None:
				raise_400(f'Incorrect tenant id[{a_tuple.tenantId}].')

	if is_blank(a_tuple.userId):
		if principal_service.is_super_admin():
			raise_400('User id is required.')
		elif principal_service.is_tenant_admin():
			a_tuple.userId = principal_service.get_user_id()
		else:
			raise_403()
	else:
		user: Optional[User] = user_service.find_by_id(a_tuple.userId)
		if user is None:
			raise_400('User id is required.')
		if principal_service.is_super_admin():
			if user.tenantId == principal_service.get_tenant_id():
				raise_400(f'Incorrect user id[{a_tuple.userId}].')
		elif principal_service.is_tenant_admin():
			if user.tenantId != principal_service.get_tenant_id():
				raise_400(f'Incorrect user id[{a_tuple.userId}].')


def validate_users(
		tuples: List[UserBasedTuple],
		user_service: UserService, principal_service: PrincipalService) -> None:
	"""
	check user id of tuple is valid or not.\n
	for super admin, user must exist; for admin, user must at same tenant
	"""
	if not principal_service.is_admin():
		raise_403()

	ArrayHelper(tuples).each(lambda x: validate_user(x, user_service, principal_service))
