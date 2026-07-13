"""Upstream lineage adapter.

Thin wrapper around ``MetricLineageResolver.trace_upstream_routes`` that
converts its dataclass-shaped ``UpstreamTraceRoute`` results into the PII
package's pydantic :class:`PiiTraceRoute`, so the rest of the platform only
sees one lineage result type.

The resolver self-wires its services via ``ask_meta_storage()`` (confirmed by
code inspection), so we only need to hand it the principal.
"""
from typing import List, Optional

from watchmen_auth import PrincipalService

# Imported lazily inside the method to avoid importing watchmen-metricflow at
# module load when only the model layer is needed (e.g. in unit tests).


class UpstreamLineageAdapter:
	"""Wraps MetricLineageResolver for upstream factor tracing."""

	def __init__(self, principal_service: PrincipalService) -> None:
		self._principal_service = principal_service

	def trace_upstream(
			self,
			topic_id: str,
			factor_id: Optional[str],
			tenant_id: str,
			max_depth: int = 3,
	) -> List:
		"""Return upstream routes as :class:`PiiTraceRoute`.

		``max_depth`` is honoured by truncating the step list of each route to
		``max_depth`` entries from the leaf (the most upstream step). The
		underlying resolver does its own cycle detection; we only cap depth for
		the PII report's "传播深度控制" (design doc section 7).
		"""
		from watchmen_metricflow.lineage.metric_lineage_resolver import MetricLineageResolver
		from watchmen_pii.model import PiiTraceRoute, PiiTraceStep

		resolver = MetricLineageResolver(self._principal_service)
		topic = resolver.resolve_topic_by_id(topic_id)
		if topic is None:
			return []
		factor = resolver.resolve_topic_factor_by_id(topic, factor_id)
		# semantic_model / measure are not relevant for raw topic+factor tracing.
		raw_routes = resolver.trace_upstream_routes(topic, factor, None, None, tenant_id)

		routes: List[PiiTraceRoute] = []
		for index, raw in enumerate(raw_routes):
			steps = self._convert_steps(raw.steps)
			if max_depth > 0 and len(steps) > max_depth:
				steps = steps[:max_depth]
			routes.append(PiiTraceRoute(
				id=f"upstream-{index}-{getattr(raw, 'id_suffix', index)}",
				title=getattr(raw, 'title', f'Upstream route {index}'),
				steps=steps,
				diagnostics=list(getattr(raw, 'diagnostics', []) or []),
			))
		return routes

	@staticmethod
	def _convert_steps(raw_steps) -> List:
		from watchmen_pii.model import PiiTraceStep

		converted = []
		for raw in raw_steps or []:
			kind = getattr(raw, 'kind', 'pipeline')
			topic_obj = getattr(raw, 'topic', None)
			factor_obj = getattr(raw, 'factor', None)
			pipeline_obj = getattr(raw, 'pipeline', None)
			converted.append(PiiTraceStep(
				kind=kind,
				topicId=getattr(topic_obj, 'topicId', None) if topic_obj is not None else None,
				topicName=getattr(topic_obj, 'name', None) if topic_obj is not None else None,
				factorId=getattr(factor_obj, 'factorId', None) if factor_obj is not None else None,
				factorName=getattr(factor_obj, 'name', None) if factor_obj is not None else None,
				pipelineId=getattr(pipeline_obj, 'pipelineId', None) if pipeline_obj is not None else None,
				pipelineName=getattr(pipeline_obj, 'name', None) if pipeline_obj is not None else None,
				sourceTableName=getattr(raw, 'source_table_name', None),
				sourceFieldName=getattr(raw, 'source_field_name', None),
			))
		return converted
