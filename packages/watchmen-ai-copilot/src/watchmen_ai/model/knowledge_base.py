from enum import Enum
from typing import Optional, Any,List

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, Auditable


# class


class KnowledgeType(str, Enum):
    METRIC = "METRIC"
    OBJECTIVE = "OBJECTIVE"
    MART = "MART"
    DATASET = "DATASET"
    DATASTORY = "DATASTORY"


class KnowledgeBase(BaseModel, TenantBasedTuple, Auditable):
    knowledgeBaseId: str = None
    name: str = None
    type: KnowledgeType = None
    description: Optional[str] = None
    params: Optional[List[str]] = None


