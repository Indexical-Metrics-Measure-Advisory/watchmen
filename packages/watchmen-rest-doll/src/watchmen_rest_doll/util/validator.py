from fastapi import HTTPException
from starlette import status

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantBasedTuple
from .utils import is_blank, is_not_blank


def validate_tenant_id(a_tuple: TenantBasedTuple, principal_service: PrincipalService) -> None:
	"""
	validate tenant id of tuple.\n
	a. for super admin, tenant id is required,\
	b. for not super admin, tenant id must be same as current principal,\n
	c. for not super admin and no tenant id, set as current principal.
	"""
	tenant_id = a_tuple.tenantId
	if principal_service.is_super_admin():
		if is_blank(tenant_id):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Tenant id is required."
			)
	elif is_not_blank(tenant_id):
		if tenant_id != principal_service.get_tenant_id():
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Unauthorized visit."
			)
	else:
		# assign tenant id by current principal
		a_tuple.tenantId = principal_service.get_tenant_id()
