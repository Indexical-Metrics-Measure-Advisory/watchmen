from typing import Union

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantBasedTuple, UserBasedTuple
from watchmen_rest.util.raise_http_exception import raise_400, raise_403
from watchmen_utilities import is_blank, is_not_blank


def validate_tenant_id(a_tuple: Union[TenantBasedTuple, UserBasedTuple], principal_service: PrincipalService) -> None:
	"""
	validate tenant id of tuple.\n
	a. for super admin, tenant id is required,\
	b. for not super admin, tenant id must be same as current principal,\n
	c. for not super admin and no tenant id, set as current principal.
	"""
	tenant_id = a_tuple.tenantId
	if principal_service.is_super_admin():
		if is_blank(tenant_id):
			raise_400('Tenant id is required.')
	elif is_not_blank(tenant_id):
		if tenant_id != principal_service.get_tenant_id():
			raise_403()
	else:
		# assign tenant id by current principal
		a_tuple.tenantId = principal_service.get_tenant_id()
