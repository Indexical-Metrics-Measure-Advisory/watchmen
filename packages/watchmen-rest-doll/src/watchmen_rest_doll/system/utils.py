from typing import List, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.external_writer import ExternalWriter
from watchmen_data_kernel.meta import TenantService
from watchmen_model.system import DataSource
from watchmen_utilities import ArrayHelper, is_not_blank


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(principal_service)


def attach_name(data: Union[DataSource, ExternalWriter], principal_service: PrincipalService):
	tenant_id = data.tenantId
	if is_not_blank(tenant_id):
		tenant = get_tenant_service(principal_service).find_by_id(tenant_id)
		data.tenantName = tenant.name
	return data


def attach_tenant_name(data_list: Union[List[DataSource], List[ExternalWriter]], principal_service: PrincipalService):
	return ArrayHelper(data_list).map(lambda x: attach_name(x, principal_service)).to_list()
