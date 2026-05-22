from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class LineageStage(str, Enum):
    METRIC = 'metric'
    SEMANTIC = 'semantic'
    TOPIC = 'topic'
    PIPELINE = 'pipeline'
    SOURCE = 'source'


class LineageNodeType(str, Enum):
    METRIC = 'metric'
    METRIC_REF = 'metric_ref'
    SEMANTIC_MODEL = 'semantic_model'
    SEMANTIC_MEASURE = 'semantic_measure'
    TOPIC = 'topic'
    TOPIC_FACTOR = 'topic_factor'
    PIPELINE = 'pipeline'
    SOURCE_TABLE = 'source_table'
    SOURCE_FIELD = 'source_field'


class LineageEdgeKind(str, Enum):
    DEFINES = 'defines'
    MAPS_TO = 'maps_to'
    READS_FROM = 'reads_from'
    DERIVED_FROM = 'derived_from'
    PRODUCES = 'produces'


class MetricLineageStatus(str, Enum):
    RESOLVED = 'resolved'
    PARTIAL = 'partial'
    UNRESOLVED = 'unresolved'


class LineageNode(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    stage: LineageStage
    type: LineageNodeType
    name: str
    label: Optional[str] = None
    description: Optional[str] = None
    badge: Optional[str] = None
    metadata: Optional[Dict[str, object]] = None


class LineageEdge(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    from_: str = Field(alias='from')
    to: str
    kind: LineageEdgeKind
    pathId: str


class LineagePath(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    title: str
    nodeIds: List[str]
    isPrimary: Optional[bool] = None


class MetricLineageSummary(BaseModel):
    metricType: str = 'unknown'
    semanticModelCount: int = 0
    topicCount: int = 0
    pipelineCount: int = 0
    sourceFieldCount: int = 0


class MetricLineageViewData(BaseModel):
    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

    metricName: str
    status: MetricLineageStatus
    summary: MetricLineageSummary
    nodes: List[LineageNode]
    edges: List[LineageEdge]
    paths: List[LineagePath]
    diagnostics: Optional[List[str]] = None


class MetricLineageBranch(BaseModel):
    id: str
    title: str
    branchType: str
    measureName: Optional[str] = None
    metricRefName: Optional[str] = None
    metricRefChain: List[str] = Field(default_factory=list)
    isPrimaryCandidate: bool = False
