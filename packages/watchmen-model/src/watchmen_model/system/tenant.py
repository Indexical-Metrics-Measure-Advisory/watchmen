from typing import Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import OptimisticLock, TenantId, Tuple


class Tenant(Tuple, OptimisticLock, ExtendedBaseModel):
	tenantId: Optional[TenantId] = None
	name: Optional[str] = None
