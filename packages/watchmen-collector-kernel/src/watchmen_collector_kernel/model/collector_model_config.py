from typing import List
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from pydantic import BaseModel


class CollectorModelConfig(TenantBasedTuple, OptimisticLock, BaseModel):
	modelId: str
	modelName: str
	depend_on: List[str]
	rawTopicCode: str

