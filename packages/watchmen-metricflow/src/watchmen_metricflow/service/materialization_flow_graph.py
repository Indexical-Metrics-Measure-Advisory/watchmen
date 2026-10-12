from heapq import heappop, heappush, heapify
from typing import Callable, Dict, List, Optional, Set

from watchmen_auth import PrincipalService
from watchmen_metricflow.model.materialization import FlowEdgeKind, FlowGraph, FlowGraphEdge, \
	FlowGraphNode, Materialization, MaterializationFlow, RunStatus
from watchmen_utilities import is_not_blank
from .materialization_metric_resolver import resolve_metric_source_topics
from .materialization_write_back import auto_topic_name


def build_flow_graph(
		flow: MaterializationFlow, materializations: List[Materialization],
		status_by_materialization_id: Dict[str, RunStatus],
		principal_service: PrincipalService
) -> FlowGraph:
	"""
	Nodes are the flow members; data edges are derived from the metric lineage:
	an edge producer -> consumer appears when the consumer's metric reads a topic
	that the producer materializes. Manually declared edges from the flow are
	appended on top; a data edge wins when both connect the same pair.
	"""
	source_topics = resolve_metric_source_topics(principal_service)
	by_id = {item.materializationId: item for item in materializations if item.materializationId}

	nodes = [
		FlowGraphNode(
			id=item.materializationId,
			materializationId=item.materializationId,
			label=item.name or item.metricLabel or item.metricName or item.materializationId,
			metricName=item.metricName or '',
			targetTopicName=item.targetTopicName,
			status=status_by_materialization_id.get(item.materializationId)
		)
		for item in materializations
	]

	edges: List[FlowGraphEdge] = []
	seen: Set[str] = set()
	for consumer in materializations:
		for source_topic in source_topics.get(consumer.metricName or '', []):
			for producer in materializations:
				if producer.materializationId == consumer.materializationId:
					continue
				if not _produces_topic(producer, source_topic.topicId, source_topic.name):
					continue
				edge_id = f'{producer.materializationId}->{consumer.materializationId}'
				if edge_id in seen:
					continue
				seen.add(edge_id)
				edges.append(FlowGraphEdge(
					id=edge_id,
					source=producer.materializationId,
					target=consumer.materializationId,
					edgeKind=FlowEdgeKind.DATA
				))
	_append_manual_edges(flow, by_id, edges, seen)
	return FlowGraph(
		flowId=flow.flowId,
		flowName=flow.name,
		nodes=nodes,
		edges=edges
	)


def _append_manual_edges(
		flow: MaterializationFlow, by_id: Dict[str, Materialization], edges: List[FlowGraphEdge],
		seen: Set[str]
) -> None:
	"""Edges referencing non-members are dropped; save_flow rejects them upfront."""
	for manual_edge in flow.manualEdges or []:
		if manual_edge.source == manual_edge.target:
			continue
		if manual_edge.source not in by_id or manual_edge.target not in by_id:
			continue
		edge_id = f'{manual_edge.source}->{manual_edge.target}'
		if edge_id in seen:
			continue
		seen.add(edge_id)
		edges.append(FlowGraphEdge(
			id=edge_id,
			source=manual_edge.source,
			target=manual_edge.target,
			edgeKind=FlowEdgeKind.MANUAL
		))


def _produces_topic(producer: Materialization, topic_id: Optional[str], topic_name: Optional[str]) -> bool:
	if topic_id and producer.targetTopicId == topic_id:
		return True
	if topic_name and producer.targetTopicName == topic_name:
		return True
	return False


def detect_cycle(node_ids: List[str], edges: List[FlowGraphEdge]) -> Optional[List[str]]:
	"""Depth first search over data edges, returns the cycle path when there is one."""
	adjacency: Dict[str, List[str]] = {node_id: [] for node_id in node_ids}
	for edge in edges:
		if edge.source in adjacency and edge.target in adjacency:
			adjacency[edge.source].append(edge.target)

	state: Dict[str, int] = {}  # 0 fresh, 1 on stack, 2 done
	path: List[str] = []

	def visit(node_id: str) -> Optional[List[str]]:
		state[node_id] = 1
		path.append(node_id)
		for target in adjacency[node_id]:
			mark = state.get(target, 0)
			if mark == 1:
				return path[path.index(target):] + [target]
			if mark == 0:
				found = visit(target)
				if found is not None:
					return found
		path.pop()
		state[node_id] = 2
		return None

	for node_id in node_ids:
		if state.get(node_id, 0) == 0:
			found = visit(node_id)
			if found is not None:
				return found
	return None


def topological_order(node_ids: List[str], edges: List[FlowGraphEdge]) -> List[str]:
	"""
	Kahn ordering over data + manual edges; the original list order breaks ties
	so independent members keep the configured sequence. Cycles cannot slip
	through the save-time check, but should one exist anyway the unresolved
	nodes are appended in their original order instead of being dropped.
	"""
	positions = {node_id: index for index, node_id in enumerate(node_ids)}
	indegree = {node_id: 0 for node_id in node_ids}
	children: Dict[str, List[str]] = {node_id: [] for node_id in node_ids}
	for edge in edges:
		if edge.source in indegree and edge.target in indegree:
			indegree[edge.target] += 1
			children[edge.source].append(edge.target)

	ready = [(positions[node_id], node_id) for node_id in node_ids if indegree[node_id] == 0]
	heapify(ready)
	ordered: List[str] = []
	while ready:
		_, node_id = heappop(ready)
		ordered.append(node_id)
		for child in children[node_id]:
			indegree[child] -= 1
			if indegree[child] == 0:
				heappush(ready, (positions[child], child))
	if len(ordered) < len(node_ids):
		done = set(ordered)
		ordered.extend(node_id for node_id in node_ids if node_id not in done)
	return ordered


def topological_levels(
		node_ids: List[str], edges: List[FlowGraphEdge],
		conflict_key_of: Optional[Callable[[str], Optional[str]]] = None
) -> List[List[str]]:
	"""
	Members grouped into dependency levels: level 0 has no dependencies, level
	N only depends on levels < N. Original list order is kept inside a level.
	Members mapped to the same conflict key (e.g. two materializations writing
	one target table) never share a level, so they never compute at the same
	time. Cycle leftovers (save-time checks prevent them) join the last level.
	"""
	remaining = list(node_ids)
	upstream: Dict[str, Set[str]] = {node_id: set() for node_id in node_ids}
	for edge in edges:
		if edge.source in upstream and edge.target in upstream:
			upstream[edge.target].add(edge.source)

	levels: List[List[str]] = []
	placed = set()
	while remaining:
		level: List[str] = []
		deferred: List[str] = []
		used_keys: Set[str] = set()
		for node_id in remaining:
			blocked = any(upstream_id not in placed for upstream_id in upstream[node_id])
			key = conflict_key_of(node_id) if conflict_key_of is not None else None
			conflicted = key is not None and key in used_keys
			if not blocked and not conflicted:
				level.append(node_id)
				if key is not None:
					used_keys.add(key)
			else:
				deferred.append(node_id)
		if not level:
			# only cycle leftovers remain (save-time checks prevent them)
			level = deferred
			deferred = []
		levels.append(level)
		placed.update(level)
		remaining = deferred
	return levels


def order_flow_materializations(
		flow: MaterializationFlow, materializations: List[Materialization],
		principal_service: PrincipalService
) -> List[str]:
	"""Member ids ordered so every member runs after its data/manual dependencies."""
	return [node_id for level in level_flow_materializations(flow, materializations, principal_service)
	        for node_id in level]


def level_flow_materializations(
		flow: MaterializationFlow, materializations: List[Materialization],
		principal_service: PrincipalService
) -> List[List[str]]:
	"""Member ids grouped in dependency levels, see topological_levels.

	Besides the data/manual edges, members writing the same target table are
	kept out of one level: concurrent factor syncs on one topic lose the
	optimistic lock, and concurrent MERGE writes on one table race.
	"""
	graph = build_flow_graph(flow, materializations, {}, principal_service)
	target_keys = _shared_target_keys(materializations)
	return topological_levels(
		[item.materializationId for item in materializations if item.materializationId],
		graph.edges, conflict_key_of=target_keys.get)


def _shared_target_keys(materializations: List[Materialization]) -> Dict[str, str]:
	"""materialization id -> conflict key of its target table.

	An explicit target topic id when set, otherwise the auto-created topic name
	derived from the metric (two materializations of one metric collide there).
	Members without any resolvable target get no key and never conflict.
	"""
	keys: Dict[str, str] = {}
	for item in materializations:
		if not item.materializationId:
			continue
		if is_not_blank(item.targetTopicId):
			keys[item.materializationId] = f'topic:{item.targetTopicId}'
		elif item.autoCreateTopic:
			keys[item.materializationId] = f'auto:{auto_topic_name(item)}'
	return keys
