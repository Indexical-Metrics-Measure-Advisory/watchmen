from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.system import TenantService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable
from watchmen_model.system import Tenant
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_any_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank

router = APIRouter()


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/tenant', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Tenant)
async def load_tenant_by_id(
		tenant_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> Optional[Tenant]:
	if is_blank(tenant_id):
		raise_400('Tenant id is required.')
	if not principal_service.is_super_admin():
		if tenant_id != principal_service.get_tenant_id():
			raise_403()

	tenant_service = get_tenant_service(principal_service)
	tenant_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		tenant: Tenant = tenant_service.find_by_id(tenant_id)
		if tenant is None:
			raise_404()
		return tenant
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		tenant_service.close_transaction()


@router.post('/tenant', tags=[UserRole.SUPER_ADMIN], response_model=Tenant)
async def save_tenant(
		tenant: Tenant, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Tenant:
	tenant_service = get_tenant_service(principal_service)

	if tenant_service.is_tuple_id_faked(tenant.tenantId):
		tenant_service.begin_transaction()
		try:
			tenant_service.redress_tuple_id(tenant)
			# noinspection PyTypeChecker
			tenant: Tenant = tenant_service.create(tenant)
			tenant_service.commit_transaction()
		except Exception as e:
			tenant_service.rollback_transaction()
			raise_500(e)
	else:
		tenant_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			tenant: Tenant = tenant_service.update(tenant)
			tenant_service.commit_transaction()
		except HTTPException as e:
			raise e
		except Exception as e:
			tenant_service.rollback_transaction()
			raise_500(e)

	return tenant


@router.post('/tenant/name', tags=[UserRole.SUPER_ADMIN], response_model=DataPage)
async def find_users_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> DataPage:
	if is_blank(query_name):
		query_name = None

	tenant_service = get_tenant_service(principal_service)
	tenant_service.begin_transaction()
	try:
		return tenant_service.find_tenants_by_text(query_name, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		tenant_service.close_transaction()
