from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, TenantId, Tuple


class Tenant(Tuple, OptimisticLock, BaseModel):
	tenantId: TenantId = None
	name: str = None
