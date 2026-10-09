from typing import Dict, List, Optional, Set

from watchmen_auth import PrincipalService
from watchmen_metricflow.model.materialization import FlowEdgeKind, FlowGraph, FlowGraphEdge, \
	FlowGraphNode, Materialization, MaterializationFlow, RunStatus
from .materialization_metric_resolver import resolve_metric_source_topics


def build_flow_graph(
		flow: MaterializationFlow, materializations: List[Materialization],
		status_by_materialization_id: Dict[str, RunStatus],
		principal_service: PrincipalService
) -> FlowGraph:
	"""
	Nodes are the flow members; data edges are derived from the metric lineage:
	an edge producer -> consumer appears when the consumer's metric reads a topic
	that the producer materializes.
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
	return FlowGraph(
		flowId=flow.flowId,
		flowName=flow.name,
		nodes=nodes,
		edges=edges
	)


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
