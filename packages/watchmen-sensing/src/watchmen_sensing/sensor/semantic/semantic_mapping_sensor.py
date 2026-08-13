from difflib import SequenceMatcher
from typing import List

from watchmen_sensing.common.constants import ASSET_TYPE_TOPIC, SIGNAL_SEMANTIC_MAPPING_CANDIDATE
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import SemanticMappingCandidate
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


def _similarity(a: str, b: str) -> float:
	if not a or not b:
		return 0.0
	return SequenceMatcher(None, a.lower(), b.lower()).ratio()


@register
class SemanticMappingSensor(BaseSensor):
	"""Semantic sensing (section 12/13). Proposes ontology mapping candidates by
	matching physical column names against ontology object/property names.

	MVP heuristic: token-level name similarity. The richer evidence (value
	pattern, relationship pattern) is layered in by later iterations and by the
	AI reasoning agents.
	"""

	sensorType = 'semantic_mapping'
	category = SignalCategory.SEMANTIC

	def detect(self, ctx: SensorContext) -> List[Signal]:
		threshold = float(ctx.config.get('similarityThreshold', 0.6))
		ontologies = ctx.adapters.ontology.list_ontologies(ctx.tenantId)
		# Build a flat list of (ontologyId, objectName, propertyName) targets.
		targets = []
		for ontology in ontologies:
			for virtual_object in (ontology.virtualObjects or []):
				object_name = getattr(virtual_object, 'name', None)
				for attribute in (getattr(virtual_object, 'attributes', None) or []):
					property_name = getattr(attribute, 'name', None)
					if property_name:
						targets.append((ontology.ontologyId, object_name, property_name))
		if not targets:
			return []

		signals: List[Signal] = []
		for topic in ctx.adapters.list_topics(ctx.tenantId):
			for factor in (topic.factors or []):
				factor_name = getattr(factor, 'name', None)
				if not factor_name:
					continue
				best = max(
					((_similarity(factor_name, prop), oid, obj, prop) for oid, obj, prop in targets),
					key=lambda x: x[0], default=(0.0, None, None, None)
				)
				score, ontology_id, object_name, property_name = best
				if score < threshold:
					continue
				candidate = SemanticMappingCandidate(
					sourceColumn=factor_name,
					ontologyObject=object_name,
					ontologyProperty=property_name,
					confidence=score,
					evidence=['name_similarity']
				)
				signals.append(self.build_signal(
					ctx, signal_type=SIGNAL_SEMANTIC_MAPPING_CANDIDATE,
					asset_type=ASSET_TYPE_TOPIC, asset_id=topic.topicId,
					severity=SignalSeverity.LOW, confidence=score,
					evidence=Evidence(
						metrics=candidate.model_dump() if hasattr(candidate, 'model_dump') else {},
						expected=property_name,
						actual=factor_name
					)
				))
		return signals
