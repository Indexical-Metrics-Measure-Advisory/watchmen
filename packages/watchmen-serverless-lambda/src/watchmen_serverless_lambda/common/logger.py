from watchmen_auth import fake_tenant_admin
from watchmen_data_kernel.meta import TenantService
from watchmen_utilities import mdc_put


def set_mdc_tenant(tenant_id: str):
    principal_service = fake_tenant_admin(tenant_id)
    tenant = TenantService(principal_service).find_by_id(principal_service.tenantId)
    mdc_put("tenant", tenant.name)