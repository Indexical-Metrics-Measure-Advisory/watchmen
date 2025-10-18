from enum import Enum
from typing import Optional

from pydantic import BaseModel


class KnowledgeType(str, Enum):
    METRIC = "METRIC"
    OBJECTIVE = "OBJECTIVE"
    DATASET = "DATASET"
    DATASTORY = "DATASTORY"

class KnowledgeCenter(BaseModel):
    knowledgeId: str = None
    name: str = None
    knowledgeType: KnowledgeType = None
    description: Optional[str] = None



class KnowledgeMetrics(KnowledgeCenter):
    refObjectiveId: str = None
    refMetricName : str = None


class KnowledgeObjectives(KnowledgeCenter):
    refObjectiveId: str = None

class KnowledgeMarts(KnowledgeCenter):
    refSubjectId: str = None


class KnowledgeDataStory(KnowledgeCenter):
    refDataStoryId: str = None




