from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


EvaluationStatus = Literal['pass', 'fail', 'skip', 'error']
RunLabel = Literal['baseline', 'candidate', 'other']
MetricDirection = Literal['higher', 'lower']


class EvaluationModel(BaseModel):
	model_config = ConfigDict(extra='forbid')


class SuiteResult(EvaluationModel):
	name: str
	status: EvaluationStatus
	detail: str = ''
	required: bool = True
	explicit_skip: bool = False
	total: Optional[int] = None
	passed: Optional[int] = None
	failed: Optional[int] = None
	skipped: Optional[int] = None
	duration_ms: Optional[int] = None
	artifacts: List[str] = Field(default_factory=list)


class MetricSample(EvaluationModel):
	name: str
	value: float
	unit: str = ''
	source: str = ''


class TaskDefinition(EvaluationModel):
	schema_version: int = 1
	id: str
	version: str
	description: str = ''
	tags: List[str] = Field(default_factory=list)
	required_suites: List[str] = Field(default_factory=list)
	allowed_skips: List[str] = Field(default_factory=list)
	required_metrics: List[str] = Field(default_factory=list)
	max_repairs: int = Field(default=2, ge=0, le=10)
	protected_paths: List[str] = Field(default_factory=list)
	layers: Dict[str, List[str]] = Field(default_factory=dict)
	l1_suites: Dict[str, List[str]] = Field(default_factory=dict)


class MetricPolicy(EvaluationModel):
	direction: MetricDirection
	max_regression_percent: float = Field(default=10.0, ge=0)
	min_samples: int = Field(default=3, ge=1)
	required: bool = False


class GatePolicy(EvaluationModel):
	schema_version: int = 1
	version: str
	required_suites: List[str] = Field(default_factory=list)
	allowed_skips: List[str] = Field(default_factory=list)
	metrics: Dict[str, MetricPolicy] = Field(default_factory=dict)
	protected_paths: List[str] = Field(default_factory=list)


class RunManifest(EvaluationModel):
	schema_version: int = 1
	run_id: str
	task_id: Optional[str] = None
	task_version: Optional[str] = None
	label: RunLabel = 'other'
	attempt: int = Field(default=0, ge=0)
	base_revision: Optional[str] = None
	head_revision: Optional[str] = None
	dirty: Optional[bool] = None
	started_at: datetime
	finished_at: Optional[datetime] = None
	command: List[str] = Field(default_factory=list)
	environment: Dict[str, str] = Field(default_factory=dict)
	config: Dict[str, Any] = Field(default_factory=dict)
	task_hash: Optional[str] = None
	policy_hash: Optional[str] = None
	changed_files: List[str] = Field(default_factory=list)
	suites: List[SuiteResult] = Field(default_factory=list)
	metrics: List[MetricSample] = Field(default_factory=list)
	artifacts: Dict[str, str] = Field(default_factory=dict)

	@property
	def overall_status(self) -> EvaluationStatus:
		if any(suite.status in {'fail', 'error'} for suite in self.suites):
			return 'fail'
		if any(suite.status == 'skip' for suite in self.suites):
			return 'skip'
		return 'pass'

	def suite(self, name: str) -> Optional[SuiteResult]:
		return next((suite for suite in self.suites if suite.name == name), None)


class GateCheck(EvaluationModel):
	name: str
	status: EvaluationStatus
	detail: str
	evidence: Dict[str, Any] = Field(default_factory=dict)


class GateResult(EvaluationModel):
	schema_version: int = 1
	run_id: str
	status: Literal['pass', 'fail']
	checks: List[GateCheck] = Field(default_factory=list)


class MetricComparison(EvaluationModel):
	name: str
	status: EvaluationStatus
	direction: MetricDirection
	baseline_median: Optional[float] = None
	candidate_median: Optional[float] = None
	change_percent: Optional[float] = None
	regression_percent: Optional[float] = None
	max_regression_percent: float
	baseline_samples: List[float] = Field(default_factory=list)
	candidate_samples: List[float] = Field(default_factory=list)
	detail: str = ''


class ComparisonReport(EvaluationModel):
	schema_version: int = 1
	status: Literal['pass', 'fail']
	baseline_runs: List[str]
	candidate_runs: List[str]
	checks: List[GateCheck] = Field(default_factory=list)
	metrics: List[MetricComparison] = Field(default_factory=list)
