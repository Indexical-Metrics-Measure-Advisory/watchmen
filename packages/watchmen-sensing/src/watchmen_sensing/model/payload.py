from datetime import datetime
from typing import Any, Dict, List, Optional

from watchmen_utilities import ExtendedBaseModel


class FreshnessPayload(ExtendedBaseModel):
	expectedSeconds: Optional[int] = None
	actualSeconds: Optional[int] = None
	lastUpdateAt: Optional[datetime] = None


class SchemaChangePayload(ExtendedBaseModel):
	changeType: Optional[str] = None
	before: Optional[Dict[str, Any]] = None
	after: Optional[Dict[str, Any]] = None


class DataProfilePayload(ExtendedBaseModel):
	rowCount: Optional[int] = None
	nullRate: Optional[float] = None
	distinctRate: Optional[float] = None
	mean: Optional[float] = None
	p95: Optional[float] = None


class DataQualityPayload(ExtendedBaseModel):
	ruleCode: Optional[str] = None
	passed: Optional[bool] = None
	ratio: Optional[float] = None
	expected: Optional[Any] = None
	actual: Optional[Any] = None


class PipelineFailurePayload(ExtendedBaseModel):
	status: Optional[str] = None
	errorCode: Optional[str] = None
	errorMessage: Optional[str] = None
	spentMillis: Optional[int] = None


class CollectorTableChangePayload(ExtendedBaseModel):
	changeType: Optional[str] = None  # TABLE_ADDED, DEFINITION_MODIFIED
	tableName: Optional[str] = None
	modelName: Optional[str] = None
	dataSourceId: Optional[str] = None


class SemanticMappingCandidate(ExtendedBaseModel):
	sourceColumn: Optional[str] = None
	ontologyObject: Optional[str] = None
	ontologyProperty: Optional[str] = None
	confidence: Optional[float] = None
	evidence: Optional[List[str]] = []
