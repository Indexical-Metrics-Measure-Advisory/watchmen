from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

from watchmen_ai.hypothesis.model.metrics import EmulativeAnalysisMethod
from watchmen_model.common import OptimisticLock, UserBasedTuple, Auditable
from watchmen_utilities import ExtendedBaseModel


class HypothesisStatus(str, Enum):
    DRAFTED = 'drafted'
    TESTING = 'testing'
    VALIDATED = 'validated'
    REJECTED = 'rejected'


class InsightType(str, Enum):
    RISK = 'risk'
    TRENDUP = 'trendup'
    OPPORTUNITY = 'opportunity'


class PriorityLevel(str, Enum):
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


class RelatedHypothesis(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: HypothesisStatus
    confidence: float


class Hypothesis(ExtendedBaseModel, UserBasedTuple, OptimisticLock,Auditable):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: Optional[HypothesisStatus] = HypothesisStatus.DRAFTED
    confidence: Optional[float] = 0.0
    metrics: Optional[List[str]] = []
    businessProblemId: Optional[str] = None
    relatedHypothesesIds: List[str] = []
    analysisMethod: Optional[EmulativeAnalysisMethod] = None




class Insight(BaseModel):
    id: str
    title: str
    type: Optional[InsightType] = None
    description: Optional[str] = None
    priority: Optional[PriorityLevel] = None