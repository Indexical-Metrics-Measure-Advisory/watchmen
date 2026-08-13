from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, List, Optional

from watchmen_auth import PrincipalService
from watchmen_utilities import get_current_time_in_seconds

from watchmen_sensing.model.autonomous import RecommendedAction
from watchmen_sensing.model.evidence import AffectedAsset, Evidence, Impact, OntologyRef
from watchmen_sensing.model.sensor import SensorPriority
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity, SignalStatus

if TYPE_CHECKING:
	# Type-hint only: importing the adapter bundle eagerly would pull the whole
	# meta/DB layer (which connects on import), so keep it out of module load.
	from watchmen_sensing.adapter import AdapterBundle


class SensorContext:
	"""Read-only context threaded through a single sensor run."""

	def __init__(
			self, principal_service: PrincipalService, tenant_id: str,
			adapters: AdapterBundle, config: Optional[dict] = None
	):
		self.principalService = principal_service
		self.tenantId = tenant_id
		self.adapters = adapters
		self.config = config or {}


class BaseSensor(ABC):
	"""Base class for all sensors. Concrete sensors override detect()."""

	sensorType: str = 'base'
	category: SignalCategory = SignalCategory.OPERATIONAL
	priority: SensorPriority = SensorPriority.P0

	@abstractmethod
	def detect(self, ctx: SensorContext) -> List[Signal]:
		"""Observe the data environment and return raw DETECTED signals."""

	def reset(self) -> None:
		"""Reset any in-memory state between runs. Default no-op."""
		pass

	# ---- helpers ----------------------------------------------------------

	def build_signal(
			self, ctx: SensorContext, signal_type: str, asset_type: str, asset_id: Any,
			severity: SignalSeverity, confidence: float,
			evidence: Optional[Evidence] = None, impact: Optional[Impact] = None,
			ontology: Optional[OntologyRef] = None,
			recommended_actions: Optional[List[RecommendedAction]] = None,
	) -> Signal:
		return Signal(
			signalType=signal_type,
			category=self.category,
			timestamp=get_current_time_in_seconds(),
			asset=AffectedAsset(type=asset_type, id=str(asset_id)),
			severity=severity,
			confidence=confidence,
			evidence=evidence,
			impact=impact,
			ontology=ontology,
			recommendedActions=recommended_actions or [],
			status=SignalStatus.DETECTED,
			source=self.sensorType,
			tenantId=ctx.tenantId,
			userId=ctx.principalService.get_user_id(),
		)
