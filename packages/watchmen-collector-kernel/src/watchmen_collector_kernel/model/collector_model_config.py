from typing import List, Optional
from watchmen_model.common import TenantBasedTuple, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class CollectorModelConfig(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	modelId: Optional[str] = None
	modelName: Optional[str] = None
	moduleId: Optional[str] = None
	dependOn: Optional[List[str]] = None
	priority: int = 0
	rawTopicCode: Optional[str] = None
	isParalleled: Optional[bool] = None

