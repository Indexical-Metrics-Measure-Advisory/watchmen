"""Pydantic models for context data transferred from Watchmen REST APIs."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FactorContext(BaseModel):
    """Lightweight representation of a Factor for LLM context."""

    factor_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None


class TopicContext(BaseModel):
    """Lightweight representation of a Topic for LLM context."""

    topic_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    kind: Optional[str] = None
    factors: List[FactorContext] = Field(default_factory=list)
    description: Optional[str] = None


class PipelineContext(BaseModel):
    """Lightweight representation of a Pipeline for LLM context."""

    pipeline_id: Optional[str] = None
    name: Optional[str] = None
    topic_id: Optional[str] = None
    trigger_type: Optional[str] = None
    stages: List[str] = Field(default_factory=list)
    enabled: Optional[bool] = None


class DqcRuleContext(BaseModel):
    """Lightweight representation of a DQC MonitorRule for LLM context."""

    rule_id: Optional[str] = None
    code: Optional[str] = None
    grade: Optional[str] = None  # global / topic / factor
    severity: Optional[str] = None
    topic_id: Optional[str] = None
    factor_id: Optional[str] = None
    params: Dict[str, Any] = Field(default_factory=dict)
    enabled: bool = False


class WatchmenContextBundle(BaseModel):
    """Aggregated context bundle fetched from all Watchmen services."""

    topics: List[TopicContext] = Field(default_factory=list)
    pipelines: List[PipelineContext] = Field(default_factory=list)
    dqc_rules: List[DqcRuleContext] = Field(default_factory=list)
    ontology: Optional[Dict[str, Any]] = None  # Serialized VirtualOntology dict
    ontology_yaml: Optional[str] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
