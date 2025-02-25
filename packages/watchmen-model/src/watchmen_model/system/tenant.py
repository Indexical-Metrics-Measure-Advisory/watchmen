

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import OptimisticLock, TenantId, Tuple
from typing import Optional


class Tenant(ExtendedBaseModel, Tuple, OptimisticLock):
	tenantId: Optional[TenantId] = None
	name: Optional[str] = None
	enableAI: Optional[bool] = None
