"""Lineage report + dashboard view models.

These wrap the raw upstream/downstream trace routes produced by the lineage
services into a single response for ``POST /dqc/pii-terms/{termId}/lineage``
and the ``GET /dqc/pii-report`` overview endpoint. Where possible they reuse
the existing lineage node/edge types from ``watchmen-metricflow`` so the DQC
frontend graph renderer does not need a second data shape.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .pii_term import LinkedFactor


class PiiTraceStep(BaseModel):
	"""One hop in an upstream or downstream trace route."""

	kind: str  # 'pipeline' | 'topic' | 'topic_factor' | 'source_table' | 'source_field'
	topicId: Optional[str] = None
	topicName: Optional[str] = None
	factorId: Optional[str] = None
	factorName: Optional[str] = None
	pipelineId: Optional[str] = None
	pipelineName: Optional[str] = None
	sourceTableName: Optional[str] = None
	sourceFieldName: Optional[str] = None


class PiiTraceRoute(BaseModel):
	"""A single traced path (upstream or downstream)."""

	id: str
	title: str
	steps: List[PiiTraceStep] = []
	diagnostics: List[str] = []


class PiiMetricRef(BaseModel):
	"""A metric that references a topic touched by the term's factors."""

	metricId: Optional[str] = None
	metricName: str
	topicId: Optional[str] = None


class PiiGraphData(BaseModel):
	"""Graph payload for the frontend, mirroring MetricLineageViewData's
	nodes + edges structure."""

	nodes: List[Dict[str, Any]] = []
	edges: List[Dict[str, Any]] = []


class PiiEncryptionCoverage(BaseModel):
	total: int = 0
	encrypted: int = 0
	plaintext: int = 0

	@property
	def coverage_ratio(self) -> float:
		return (self.encrypted / self.total) if self.total > 0 else 0.0


class PiiLineageReport(BaseModel):
	"""Response of ``POST /dqc/pii-terms/{termId}/lineage``."""

	termId: str
	termName: Optional[str] = None
	sensitivityLevel: Optional[str] = None
	linkedFactors: List[LinkedFactor] = []
	upstreamRoutes: List[PiiTraceRoute] = []
	downstreamRoutes: List[PiiTraceRoute] = []
	metrics: List[PiiMetricRef] = []
	graphData: PiiGraphData = Field(default_factory=PiiGraphData)
	encryptionCoverage: PiiEncryptionCoverage = Field(default_factory=PiiEncryptionCoverage)
	maxUpstreamDepth: int = 0
	maxDownstreamDepth: int = 0


class PiiTermOverview(BaseModel):
	"""One row in the term-level overview table (design doc section 9)."""

	termId: Optional[str] = None
	termName: str
	sensitivityLevel: Optional[str] = None
	category: Optional[str] = None
	linkedFactorCount: int = 0
	topicCount: int = 0
	pipelineCount: int = 0
	metricCount: int = 0
	encryptedFactorCount: int = 0
	plaintextFactorCount: int = 0
	maxUpstreamDepth: int = 0
	maxDownstreamDepth: int = 0


class PiiGlobalDashboard(BaseModel):
	"""Response of ``GET /dqc/pii-report``."""

	totalTerms: int = 0
	bySensitivityLevel: Dict[str, int] = Field(default_factory=dict)
	byCategory: Dict[str, int] = Field(default_factory=dict)
	highRiskTerms: List[PiiTermOverview] = []
	topImpactTerms: List[PiiTermOverview] = []
	terms: List[PiiTermOverview] = []
