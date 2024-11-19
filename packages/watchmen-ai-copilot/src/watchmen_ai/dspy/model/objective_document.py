from typing import List, Optional

from demo.model.watchmen_document import WatchmenDocument
from pydantic import BaseModel


class VisualizationNode(BaseModel):
    visualization_type: str


class MetricNode(BaseModel):
    name: str = None
    formula: str = None
    description: str = None
    visualization: str = None
    dimensions: Optional[List[str]] = []
    reason: str = None


class ObjectiveNode(BaseModel):

    objective_name: str = None
    description: str = None
    metrics: Optional[List[MetricNode]] = []


class DimensionNode(BaseModel):
    name: str
    description: str


class BusinessTargetNode(BaseModel):
    name: str
    description: str
    keywords: Optional[List[str]] = []


class ObjectiveDocument(WatchmenDocument):
    business_target: BusinessTargetNode = None
    objectives: List[ObjectiveNode] = []
    dimensions: Optional[List[DimensionNode]] = []
