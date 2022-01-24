from watchmen.model.common import TenantId, Tuple


class Tenant(Tuple):
	tenantId: TenantId = None
	name: str = None
