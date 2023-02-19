from typing import List
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from pydantic import BaseModel


class CollectorModelConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	modelId: str
	modelName: str
	dependOn: List[str]
	rawTopicCode: str
	isParalleled: bool

