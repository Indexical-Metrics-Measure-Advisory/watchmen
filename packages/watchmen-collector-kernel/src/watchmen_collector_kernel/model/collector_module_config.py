from typing import List, Optional
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class CollectorModuleConfig(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	moduleId: Optional[str] = None
	moduleName: Optional[str] = None
	priority: int = 0

