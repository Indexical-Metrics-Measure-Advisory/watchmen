from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from watchmen_model.common import Auditable, UserBasedTuple
from watchmen_utilities import ArrayHelper, ExtendedBaseModel

from watchmen_sensing.model.autonomous import RecommendedAction
from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.evidence import AffectedAsset, Evidence, Impact, OntologyRef


class SignalCategory(str, Enum):
	SOURCE = 'source'
	SCHEMA = 'schema'
	DATA = 'data'
	DATA_QUALITY = 'data_quality'
	DATA_FRESHNESS = 'data_freshness'
	DATA_DRIFT = 'data_drift'
	SEMANTIC = 'semantic'
	LINEAGE = 'lineage'
	OPERATIONAL = 'operational'
	USAGE = 'usage'
	BUSINESS = 'business'


class SignalSeverity(str, Enum):
	LOW = 'low'
	MEDIUM = 'medium'
	HIGH = 'high'
	CRITICAL = 'critical'


class SignalStatus(str, Enum):
	"""Signal lifecycle (section 28)."""
	DETECTED = 'detected'
	ENRICHED = 'enriched'
	CLASSIFIED = 'classified'
	CORRELATED = 'correlated'
	IMPACT_ANALYZED = 'impact_analyzed'
	ACTION_PLANNED = 'action_planned'
	ACTION_EXECUTED = 'action_executed'
	VERIFIED = 'verified'
	RESOLVED = 'resolved'


def _construct_asset(value: Any) -> Any:
	if value is None or isinstance(value, AffectedAsset):
		return value
	if isinstance(value, dict):
		return AffectedAsset(**value)
	return value


def _construct_ontology(value: Any) -> Any:
	if value is None or isinstance(value, OntologyRef):
		return value
	if isinstance(value, dict):
		return OntologyRef(**value)
	return value


def _construct_evidence(value: Any) -> Any:
	if value is None or isinstance(value, Evidence):
		return value
	if isinstance(value, dict):
		return Evidence(**value)
	return value


def _construct_impact(value: Any) -> Any:
	if value is None or isinstance(value, Impact):
		return value
	if isinstance(value, dict):
		return Impact(**value)
	return value


def _construct_context(value: Any) -> Any:
	if value is None or isinstance(value, SignalContext):
		return value
	if isinstance(value, dict):
		return SignalContext(**value)
	return value


def _construct_actions(value: Any) -> Any:
	if value is None:
		return []
	if isinstance(value, list):
		return ArrayHelper(value).map(
			lambda x: x if isinstance(x, RecommendedAction) else RecommendedAction(**x)
		).to_list()
	return value


class Signal(ExtendedBaseModel, UserBasedTuple, Auditable):
	"""The standard signal model (section 27).

	Append-mostly: status transitions are written via update, but the signal is
	not user-editable configuration, so no optimistic lock is used.
	"""
	signalId: Optional[str] = None
	signalType: str
	category: SignalCategory
	timestamp: datetime
	asset: AffectedAsset
	ontology: Optional[OntologyRef] = None
	severity: SignalSeverity
	confidence: float = 0.0
	evidence: Optional[Evidence] = None
	impact: Optional[Impact] = None
	context: Optional[SignalContext] = None
	recommendedActions: Optional[List[RecommendedAction]] = []
	status: SignalStatus = SignalStatus.DETECTED
	rootCause: Optional[str] = None
	source: Optional[str] = None

	def __setattr__(self, name, value):
		if name == 'asset':
			super().__setattr__(name, _construct_asset(value))
		elif name == 'ontology':
			super().__setattr__(name, _construct_ontology(value))
		elif name == 'evidence':
			super().__setattr__(name, _construct_evidence(value))
		elif name == 'impact':
			super().__setattr__(name, _construct_impact(value))
		elif name == 'context':
			super().__setattr__(name, _construct_context(value))
		elif name == 'recommendedActions':
			super().__setattr__(name, _construct_actions(value))
		else:
			super().__setattr__(name, value)


class SignalQuery(ExtendedBaseModel):
	"""Query criteria for signals."""
	tenantId: Optional[str] = None
	category: Optional[SignalCategory] = None
	severity: Optional[SignalSeverity] = None
	status: Optional[SignalStatus] = None
	assetType: Optional[str] = None
	assetId: Optional[str] = None
	signalType: Optional[str] = None
	pageNumber: Optional[int] = 1
	pageSize: Optional[int] = 20
