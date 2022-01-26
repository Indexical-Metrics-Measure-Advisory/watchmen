from watchmen_model.common import OptimisticLock, TenantId, Tuple


class Tenant(Tuple, OptimisticLock):
	tenantId: TenantId = None
	name: str = None
