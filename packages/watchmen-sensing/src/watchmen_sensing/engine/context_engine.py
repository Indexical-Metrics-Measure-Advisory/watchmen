from typing import Optional

from watchmen_utilities import get_current_time_in_seconds

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.evidence import Impact
from watchmen_sensing.model.signal import Signal


class ContextEngine:
	"""Builds the compressed, LLM-friendly SignalContext (section 3 + section 29).

	Raw data never reaches here — only ontology snapshots, lineage summaries,
	impact projections and historical signals. Each section is built defensively
	so a missing subsystem cannot break the whole context.
	"""

	def __init__(self, adapters: AdapterBundle):
		self.adapters = adapters

	def build(self, signal: Signal, signal_service: SignalService) -> SignalContext:
		ontology_snapshot = self._ontology_snapshot(signal)
		lineage = self._lineage(signal)
		impact = self._impact(signal, ontology_snapshot)
		history = self._history(signal, signal_service)
		return SignalContext(
			ontologySnapshot=ontology_snapshot,
			lineage=lineage,
			impact=impact,
			history=history,
			relatedSignals=[],
			fetchedAt=get_current_time_in_seconds()
		)

	def _ontology_snapshot(self, signal: Signal) -> Optional[dict]:
		try:
			if signal.asset is None or signal.asset.type != ASSET_TYPE_TOPIC:
				return None
			ontology = self.adapters.ontology.find_containing_topic(
				signal.asset.id, signal.tenantId)
			return self.adapters.ontology.snapshot(ontology)
		except Exception:
			return None

	def _lineage(self, signal: Signal) -> Optional[dict]:
		try:
			if signal.asset is None or signal.asset.type != ASSET_TYPE_TOPIC:
				return None
			upstream = self.adapters.lineage.find_upstream(signal.asset.id)
			if upstream is None:
				return None
			if hasattr(upstream, 'model_dump'):
				return upstream.model_dump()
			if isinstance(upstream, dict):
				return upstream
			return {'upstream': str(upstream)}
		except Exception:
			return None

	def _impact(self, signal: Signal, ontology_snapshot: Optional[dict]) -> Optional[Impact]:
		# MVP impact projection: pull affected data products / ontology objects from
		# the ontology snapshot if present. Full impact reasoning is done by the AI
		# agent over this context.
		try:
			if not ontology_snapshot:
				return signal.impact
			objects = [
				vo.get('name') if isinstance(vo, dict) else getattr(vo, 'name', None)
				for vo in (ontology_snapshot.get('virtualObjects') or [])
			]
			objects = [o for o in objects if o]
			return Impact(
				dataProducts=signal.impact.dataProducts if signal.impact else [],
				metrics=signal.impact.metrics if signal.impact else [],
				ontologyObjects=objects,
				pipelines=[]
			)
		except Exception:
			return signal.impact

	def _history(self, signal: Signal, signal_service: SignalService) -> list:
		try:
			if signal.asset is None:
				return []
			recent = signal_service.find_recent_by_asset(
				signal.asset.type, signal.asset.id, signal.tenantId, limit=5)
			# Exclude the signal itself and strip heavy fields for token economy.
			history = []
			for item in recent:
				if signal.signalId is not None and getattr(item, 'signalId', None) == signal.signalId:
					continue
				history.append({
					'signalType': getattr(item, 'signalType', None),
					'severity': getattr(item, 'severity', None),
					'timestamp': str(getattr(item, 'timestamp', '')),
					'status': getattr(item, 'status', None)
				})
			return history
		except Exception:
			return []
