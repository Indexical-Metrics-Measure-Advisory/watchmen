from typing import List
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from pydantic import BaseModel


class CollectorModuleConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	moduleId: str
	moduleName: str
	priority: int = 0

