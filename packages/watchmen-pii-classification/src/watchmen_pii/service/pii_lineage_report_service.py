"""PII lineage report aggregator.

Given a term, walks each linked factor in both directions (upstream via
:class:`UpstreamLineageAdapter`, downstream via
:class:`DownstreamLineageResolver`), collects referencing metrics, computes
encryption coverage and assembles a single :class:`PiiLineageReport` plus a
graph payload shaped like ``MetricLineageViewData``'s nodes + edges.
"""
from logging import getLogger
from typing import Dict, List, Optional, Set

from watchmen_auth import PrincipalService

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	LinkedFactor,
	PiiEncryptionCoverage,
	PiiGraphData,
	PiiLineageReport,
	PiiMetricRef,
	PiiTraceRoute,
	PiiTraceStep,
)
from watchmen_pii.service.downstream_lineage import DownstreamLineageResolver
from watchmen_pii.service.upstream_lineage import UpstreamLineageAdapter

logger = getLogger(__name__)

# Edge kinds (string values match watchmen-metricflow LineageEdgeKind so the
# frontend renderer treats them uniformly).
EDGE_READS_FROM = 'reads_from'
EDGE_PRODUCES = 'produces'
EDGE_MAPS_TO = 'maps_to'


class PIILineageReportService:
	"""Build a :class:`PiiLineageReport` for a term."""

	def __init__(
			self,
			pii_term_service: PIITermService,
			principal_service: PrincipalService,
			max_depth: int = 3,
	) -> None:
		self._pii_term_service = pii_term_service
		self._principal_service = principal_service
		self._max_depth = max_depth

	def analyze(
			self,
			term_id: str,
			max_depth: Optional[int] = None,
			include_metrics: bool = True,
	) -> PiiLineageReport:
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			return PiiLineageReport(termId=term_id)

		tenant_id = self._principal_service.get_tenant_id()
		depth = self._max_depth if max_depth is None else max_depth

		linked = term.linkedFactors or []
		upstream_routes, downstream_routes = self._trace_linked(linked, tenant_id, depth)
		metrics = self._collect_metrics(linked, upstream_routes, downstream_routes) if include_metrics else []
		coverage = self._encryption_coverage(linked)
		graph = self._build_graph(term_id, linked, upstream_routes, downstream_routes, metrics)

		max_up = self._max_depth_of(upstream_routes)
		max_down = self._max_depth_of(downstream_routes)

		return PiiLineageReport(
			termId=term_id,
			termName=term.name,
			sensitivityLevel=term.sensitivityLevel,
			linkedFactors=linked,
			upstreamRoutes=upstream_routes,
			downstreamRoutes=downstream_routes,
			metrics=metrics,
			graphData=graph,
			encryptionCoverage=coverage,
			maxUpstreamDepth=max_up,
			maxDownstreamDepth=max_down,
		)

	# ------------------------------------------------------------------ tracing

	def _trace_linked(
			self, linked: List[LinkedFactor], tenant_id: str, depth: int
	):
		upstream_adapter = UpstreamLineageAdapter(self._principal_service)
		downstream_resolver = DownstreamLineageResolver(self._principal_service, max_depth=depth)

		all_upstream: List[PiiTraceRoute] = []
		all_downstream: List[PiiTraceRoute] = []
		for lf in linked:
			try:
				all_upstream.extend(
					upstream_adapter.trace_upstream(lf.topicId, lf.factorId, tenant_id, depth)
				)
			except Exception:
				logger.exception("Upstream trace failed for %s:%s", lf.topicId, lf.factorId)
			try:
				all_downstream.extend(
					downstream_resolver.trace_downstream(lf.topicId, lf.factorId, tenant_id, depth)
				)
			except Exception:
				logger.exception("Downstream trace failed for %s:%s", lf.topicId, lf.factorId)
		return self._dedup_routes(all_upstream), self._dedup_routes(all_downstream)

	@staticmethod
	def _dedup_routes(routes: List[PiiTraceRoute]) -> List[PiiTraceRoute]:
		seen: Set[str] = set()
		deduped: List[PiiTraceRoute] = []
		for route in routes:
			key = route.id
			if key in seen:
				continue
			seen.add(key)
			deduped.append(route)
		return deduped

	# ------------------------------------------------------------------ metrics

	def _collect_metrics(
			self,
			linked: List[LinkedFactor],
			upstream: List[PiiTraceRoute],
			downstream: List[PiiTraceRoute],
	) -> List[PiiMetricRef]:
		"""Find metrics that reference any topic touched by the trace.

		Metric -> SemanticModel.topicId matching is done defensively: we import
		the metricflow services lazily and tolerate any failure (e.g. no
		semantic models defined) by returning an empty list.
		"""
		topics_touched: Set[str] = {lf.topicId for lf in linked if lf.topicId}
		for route in upstream + downstream:
			for step in route.steps:
				if step.topicId:
					topics_touched.add(step.topicId)
		if not topics_touched:
			return []

		try:
			from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
			from watchmen_metricflow.meta.metrics_meta_service import MetricService
			from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
			from watchmen_metricflow.util import trans_readonly
		except Exception:  # pragma: no cover
			logger.debug("metricflow services unavailable; skipping metric collection.", exc_info=True)
			return []

		try:
			semantic_service = SemanticModelService(
				ask_meta_storage(), ask_snowflake_generator(), self._principal_service
			)
			metric_service = MetricService(
				ask_meta_storage(), ask_snowflake_generator(), self._principal_service
			)
			# SemanticModel.topicId is the join key.
			semantic_models = trans_readonly(
				semantic_service, lambda: semantic_service.find_all(self._principal_service.get_tenant_id())
			)
			semantic_topic_to_model = {
				str(sm.topicId): sm for sm in (semantic_models or []) if getattr(sm, 'topicId', None)
			}
			refs: List[PiiMetricRef] = []
			seen_metrics: Set[str] = set()
			metrics = trans_readonly(
				metric_service, lambda: metric_service.find_all(self._principal_service.get_tenant_id())
			)
			for metric in metrics or []:
				name = getattr(metric, 'name', None)
				if not name or name in seen_metrics:
					continue
				# Match if the metric's semantic model references a touched topic.
				metric_semantic_id = getattr(getattr(metric, 'type_params', None), 'model', None) or \
					getattr(metric, 'semanticModelId', None)
				semantic_model = None
				if metric_semantic_id:
					semantic_model = next(
						(sm for sm in (semantic_models or []) if str(getattr(sm, 'id', '')) == str(metric_semantic_id)),
						None,
					)
				topic_id = getattr(semantic_model, 'topicId', None) if semantic_model else None
				if topic_id and str(topic_id) in topics_touched:
					seen_metrics.add(name)
					refs.append(PiiMetricRef(
						metricId=str(getattr(metric, 'id', '') or ''),
						metricName=name,
						topicId=str(topic_id),
					))
			_ = semantic_topic_to_model  # kept for clarity / future joins
			return refs
		except Exception:
			logger.debug("Metric collection failed; returning empty list.", exc_info=True)
			return []

	# ------------------------------------------------------------------ encryption

	def _encryption_coverage(self, linked: List[LinkedFactor]) -> PiiEncryptionCoverage:
		total = len(linked)
		# LinkedFactor does not carry an encrypt flag directly; we resolve the
		# underlying Factor.encrypt via the topic service when possible.
		encrypted_count = 0
		try:
			from watchmen_meta.admin import TopicService
			from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
			from watchmen_metricflow.util import trans_readonly
			topic_service = TopicService(
				ask_meta_storage(), ask_snowflake_generator(), self._principal_service
			)
			by_topic: Dict[str, Set[str]] = {}
			for lf in linked:
				by_topic.setdefault(lf.topicId, set()).add(lf.factorId)
			for topic_id, factor_ids in by_topic.items():
				topic = trans_readonly(topic_service, lambda: topic_service.find_by_id(topic_id))
				if topic is None:
					continue
				for factor in topic.factors or []:
					if factor.factorId in factor_ids and factor.encrypt is not None:
						if str(getattr(factor.encrypt, 'value', factor.encrypt)) != 'none':
							encrypted_count += 1
		except Exception:
			logger.debug("Could not resolve encryption coverage; defaulting to 0.", exc_info=True)
		plaintext = total - encrypted_count
		return PiiEncryptionCoverage(total=total, encrypted=encrypted_count, plaintext=max(plaintext, 0))

	# ------------------------------------------------------------------ graph

	def _build_graph(
			self,
			term_id: str,
			linked: List[LinkedFactor],
			upstream: List[PiiTraceRoute],
			downstream: List[PiiTraceRoute],
			metrics: List[PiiMetricRef],
	) -> PiiGraphData:
		nodes: List[Dict] = []
		edges: List[Dict] = []
		seen_nodes: Set[str] = set()

		def add_node(node_id: str, node_type: str, name: str, metadata: Optional[Dict] = None) -> None:
			if node_id in seen_nodes:
				return
			seen_nodes.add(node_id)
			nodes.append({
				'id': node_id,
				'type': node_type,
				'name': name,
				'metadata': metadata or {},
			})

		term_node = f"term:{term_id}"
		add_node(term_node, 'term', term_id, {'kind': 'pii_term'})

		for lf in linked:
			factor_node = f"topic_factor:{lf.topicId}:{lf.factorId}"
			add_node(factor_node, 'topic_factor', lf.factorName or lf.factorId, {
				'topicId': lf.topicId, 'factorId': lf.factorId,
			})
			edges.append({'from': term_node, 'to': factor_node, 'kind': EDGE_MAPS_TO})

		def walk(routes: List[PiiTraceRoute], edge_kind: str) -> None:
			for route in routes:
				prev: Optional[str] = None
				for step in route.steps:
					node_id = self._node_id_for_step(step)
					if node_id is None:
						continue
					add_node(node_id, self._node_type_for_step(step), self._node_name_for_step(step))
					if prev is not None and prev != node_id:
						edges.append({'from': prev, 'to': node_id, 'kind': edge_kind})
					prev = node_id

		walk(upstream, EDGE_READS_FROM)
		walk(downstream, EDGE_PRODUCES)

		for metric in metrics:
			metric_node = f"metric:{metric.metricName}"
			add_node(metric_node, 'metric', metric.metricName, {'metricId': metric.metricId})
			if metric.topicId:
				# connect to any topic_factor node on that topic
				for n in list(seen_nodes):
					if n.startswith(f"topic_factor:{metric.topicId}:"):
						edges.append({'from': metric_node, 'to': n, 'kind': EDGE_MAPS_TO})

		return PiiGraphData(nodes=nodes, edges=edges)

	@staticmethod
	def _node_id_for_step(step: PiiTraceStep) -> Optional[str]:
		if step.kind == 'topic' or step.kind == 'topic_factor':
			if step.factorId:
				return f"topic_factor:{step.topicId}:{step.factorId}"
			return f"topic:{step.topicId}" if step.topicId else None
		if step.kind == 'pipeline':
			return f"pipeline:{step.pipelineId}" if step.pipelineId else None
		if step.kind == 'source_table':
			return f"source_table:{step.sourceTableName}" if step.sourceTableName else None
		if step.kind == 'source_field':
			return f"source_field:{step.sourceTableName}:{step.sourceFieldName}"
		return None

	@staticmethod
	def _node_type_for_step(step: PiiTraceStep) -> str:
		return {
			'topic': 'topic', 'topic_factor': 'topic_factor', 'pipeline': 'pipeline',
			'source_table': 'source_table', 'source_field': 'source_field',
		}.get(step.kind, step.kind)

	@staticmethod
	def _node_name_for_step(step: PiiTraceStep) -> str:
		if step.kind == 'topic':
			return step.topicName or step.topicId or ''
		if step.kind == 'topic_factor':
			return step.factorName or step.factorId or ''
		if step.kind == 'pipeline':
			return step.pipelineName or step.pipelineId or ''
		if step.kind in ('source_table', 'source_field'):
			return step.sourceFieldName or step.sourceTableName or ''
		return ''

	@staticmethod
	def _max_depth_of(routes: List[PiiTraceRoute]) -> int:
		"""Approximate depth as the longest step chain across routes."""
		best = 0
		for route in routes:
			# Count topic_factor hops as the meaningful depth units.
			hops = sum(1 for s in route.steps if s.kind == 'topic_factor')
			if hops > best:
				best = hops
		return best
