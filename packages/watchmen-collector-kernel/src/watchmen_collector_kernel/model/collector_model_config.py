from typing import List
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from pydantic import BaseModel


class CollectorModelConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	modelId: str
	modelName: str
	moduleId: str
	dependOn: List[str]
	priority: int = 0
	rawTopicCode: str
	isParalleled: bool

