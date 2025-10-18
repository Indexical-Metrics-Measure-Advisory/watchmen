from datetime import datetime
from enum import Enum
from typing import List, Optional

from watchmen_model.common import OptimisticLock, UserBasedTuple, Auditable
from watchmen_utilities import ExtendedBaseModel


class BusinessProblemStatus(str, Enum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'


class BusinessProblem(ExtendedBaseModel, UserBasedTuple, OptimisticLock,Auditable):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: BusinessProblemStatus = BusinessProblemStatus.OPEN
    hypothesisIds: List[str] = []
    businessChallengeId : Optional[str] = None
    aiAnswer: Optional[str] =None
    datasetStartDate :Optional[datetime] = None
    datasetEndDate : Optional[datetime] = None



class BusinessChallenge(ExtendedBaseModel, UserBasedTuple, OptimisticLock,Auditable):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    problemIds: List[str] = []




