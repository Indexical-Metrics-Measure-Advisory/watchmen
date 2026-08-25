"""PII lineage report aggregator.

Given a term, walks each linked factor in both directions (upstream via
:class:`UpstreamLineageResolver`, downstream via
:class:`DownstreamLineageResolver`), computes encryption coverage and
assembles a single :class:`PiiLineageReport` plus a nodes + edges graph
payload for the frontend.
"""
from logging import getLogger
from typing import Dict, List, Optional, Set

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	EDGE_MAPS_TO,
	EDGE_PRODUCES,
	EDGE_READS_FROM,
	LinkedFactor,
	PiiEncryptionCoverage,
	PiiGraphData,
	PiiLineageReport,
	PiiTraceRoute,
	PiiTraceStep,
)
from watchmen_pii.service.downstream_lineage import DownstreamLineageResolver
from watchmen_pii.service.upstream_lineage import UpstreamLineageResolver

logger = getLogger(__name__)


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
	) -> PiiLineageReport:
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			return PiiLineageReport(termId=term_id)

		tenant_id = self._principal_service.get_tenant_id()
		depth = self._max_depth if max_depth is None else max_depth

		linked = term.linkedFactors or []
		upstream_routes, downstream_routes = self._trace_linked(linked, tenant_id, depth)
		coverage = self._encryption_coverage(linked)
		graph = self._build_graph(term_id, term.name, linked, upstream_routes, downstream_routes)

		max_up = self._max_depth_of(upstream_routes)
		max_down = self._max_depth_of(downstream_routes)

		return PiiLineageReport(
			termId=term_id,
			termName=term.name,
			sensitivityLevel=term.sensitivityLevel,
			linkedFactors=linked,
			upstreamRoutes=upstream_routes,
			downstreamRoutes=downstream_routes,
			graphData=graph,
			encryptionCoverage=coverage,
			maxUpstreamDepth=max_up,
			maxDownstreamDepth=max_down,
		)

	# ------------------------------------------------------------------ tracing

	def _trace_linked(
			self, linked: List[LinkedFactor], tenant_id: str, depth: int
	):
		# Resolvers share this request's storage (and its transaction) via the
		# request-scoped PIITermService.
		upstream_resolver = UpstreamLineageResolver(
			self._principal_service, max_depth=depth, pii_term_service=self._pii_term_service)
		downstream_resolver = DownstreamLineageResolver(
			self._principal_service, max_depth=depth, pii_term_service=self._pii_term_service)

		all_upstream: List[PiiTraceRoute] = []
		all_downstream: List[PiiTraceRoute] = []
		for lf in linked:
			try:
				all_upstream.extend(
					upstream_resolver.trace_upstream(lf.topicId, lf.factorId, tenant_id, depth)
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

	# ------------------------------------------------------------------ encryption

	def _encryption_coverage(self, linked: List[LinkedFactor]) -> PiiEncryptionCoverage:
		total = len(linked)
		# LinkedFactor does not carry an encrypt flag directly; we resolve the
		# underlying Factor.encrypt via the topic service when possible. The
		# topic service shares the request's storage and transaction.
		encrypted_count = 0
		try:
			topic_service = TopicService(
				self._pii_term_service.storage,
				self._pii_term_service.snowflakeGenerator,
				self._principal_service,
			)
			by_topic: Dict[str, Set[str]] = {}
			for lf in linked:
				by_topic.setdefault(lf.topicId, set()).add(lf.factorId)
			for topic_id, factor_ids in by_topic.items():
				topic = topic_service.find_by_id(topic_id)
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
			term_name: Optional[str],
			linked: List[LinkedFactor],
			upstream: List[PiiTraceRoute],
			downstream: List[PiiTraceRoute],
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
		add_node(term_node, 'term', term_name or term_id, {'kind': 'pii_term'})

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
