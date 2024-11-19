from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, Auditable


# class


class KnowledgeType(str, Enum):
    METRIC = "METRIC"
    OBJECTIVE = "OBJECTIVE"
    MART = "MART"
    DATASET = "DATASET"


class KnowledgeBase(BaseModel, TenantBasedTuple, Auditable):
    knowledgeBaseId: str = None
    name: str = None
    type: KnowledgeType = None

    description: str = None
    graph: Any = None
    vectorDB: Optional[str] = None
    embeddingType: Optional[str] = None
