import {
	PiiGraphNode,
	PiiLineageReport,
	PiiLinkedFactor,
	PiiTraceRoute,
	PiiTraceStep
} from '@/services/data/data-quality/pii-types';

/** node types produced by backend lineage report */
export const PII_NODE_TYPE_TERM = 'term';
export const PII_NODE_TYPE_FACTOR = 'topic_factor';
export const PII_NODE_TYPE_TOPIC = 'topic';
export const PII_NODE_TYPE_PIPELINE = 'pipeline';
export const PII_NODE_TYPE_SOURCE_TABLE = 'source_table';
export const PII_NODE_TYPE_SOURCE_FIELD = 'source_field';

/** edge kinds of the display model */
export const PII_EDGE_MAPS_TO = 'maps_to';
export const PII_EDGE_UPSTREAM = 'upstream';
export const PII_EDGE_DOWNSTREAM = 'downstream';

export interface PiiLineageDisplayNode {
	id: string;
	name: string;
	type: string;
	/** 0 is the anchor column (term + linked factors), negative upstream, positive downstream */
	column: number;
	/** index within the column, assigned by layout */
	row: number;
	sensitivity?: string;
	topicName?: string;
}

export interface PiiLineageDisplayEdge {
	source: string;
	target: string;
	kind: string;
}

export interface PiiLineageDisplayModel {
	nodes: Array<PiiLineageDisplayNode>;
	edges: Array<PiiLineageDisplayEdge>;
	hasRoutes: boolean;
}

/** node id of a linked factor, mirrors backend `_node_id_for_step` */
export const asFactorNodeId = (topicId: string, factorId: string): string => {
	return `topic_factor:${topicId}:${factorId}`;
};

const asStepNodeId = (step: PiiTraceStep): string | null => {
	if (step.kind === 'topic' || step.kind === PII_NODE_TYPE_FACTOR) {
		if (step.factorId) {
			return asFactorNodeId(step.topicId ?? '', step.factorId);
		}
		return step.topicId ? `topic:${step.topicId}` : null;
	}
	if (step.kind === PII_NODE_TYPE_PIPELINE) {
		return step.pipelineId ? `pipeline:${step.pipelineId}` : null;
	}
	if (step.kind === PII_NODE_TYPE_SOURCE_TABLE) {
		return step.sourceTableName ? `source_table:${step.sourceTableName}` : null;
	}
	if (step.kind === PII_NODE_TYPE_SOURCE_FIELD) {
		return step.sourceTableName ? `source_field:${step.sourceTableName}:${step.sourceFieldName ?? ''}` : null;
	}
	return null;
};

const asStepNodeName = (step: PiiTraceStep): string => {
	if (step.kind === 'topic') {
		return step.topicName || step.topicId || '';
	}
	if (step.kind === PII_NODE_TYPE_FACTOR) {
		return step.factorName || step.factorId || '';
	}
	if (step.kind === PII_NODE_TYPE_PIPELINE) {
		return step.pipelineName || step.pipelineId || '';
	}
	if (step.kind === PII_NODE_TYPE_SOURCE_TABLE || step.kind === PII_NODE_TYPE_SOURCE_FIELD) {
		return step.sourceFieldName || step.sourceTableName || '';
	}
	return '';
};

const asStepNodeType = (step: PiiTraceStep): string => {
	return step.kind;
};

/**
 * Build a layered display model from a lineage report.
 *
 * Chain semantics of backend routes: the first step of a route is always a pipeline step
 * which carries the anchor (topicId/factorId it writes to or reads from).
 * Upstream routes walk from the anchor towards sources, so data flows along the reversed chain
 * into the anchor. Downstream routes walk from the anchor towards targets,
 * so data flows along the chain away from the anchor.
 */
export const buildLineageDisplayModel = (report: PiiLineageReport): PiiLineageDisplayModel => {
	const nodeMap: Record<string, PiiLineageDisplayNode> = {};
	const edges: Array<PiiLineageDisplayEdge> = [];
	const edgeKeys: Record<string, boolean> = {};

	const ensureNode = (id: string, name: string, type: string, extras?: Partial<PiiLineageDisplayNode>): PiiLineageDisplayNode => {
		let node = nodeMap[id];
		if (node == null) {
			node = {id, name, type, column: 0, row: 0, ...extras};
			nodeMap[id] = node;
		}
		return node;
	};
	const addEdge = (source: string, target: string, kind: string) => {
		if (source === target) {
			return;
		}
		const key = `${source}|${target}|${kind}`;
		if (edgeKeys[key]) {
			return;
		}
		edgeKeys[key] = true;
		edges.push({source, target, kind});
	};

	const termNodeId = `term:${report.termId}`;
	ensureNode(termNodeId, report.termName || report.termId, PII_NODE_TYPE_TERM, {sensitivity: report.sensitivityLevel});

	// linked factors are the anchors, placed on the center column together with the term
	(report.linkedFactors ?? []).forEach(factor => {
		const nodeId = asFactorNodeId(factor.topicId, factor.factorId);
		ensureNode(nodeId, factor.factorName || factor.factorId, PII_NODE_TYPE_FACTOR, {
			sensitivity: report.sensitivityLevel,
			topicName: factor.topicName
		});
		addEdge(termNodeId, nodeId, PII_EDGE_MAPS_TO);
	});

	const walkRoutes = (routes: Array<PiiTraceRoute>, upstream: boolean) => {
		(routes ?? []).forEach(route => {
			const steps = route.steps ?? [];
			if (steps.length === 0) {
				return;
			}
			const first = steps[0];
			if (!first.topicId || !first.factorId) {
				return;
			}
			const anchorId = asFactorNodeId(first.topicId, first.factorId);
			ensureNode(anchorId, first.factorName || first.factorId, PII_NODE_TYPE_FACTOR);

			let previousNodeId = anchorId;
			steps.forEach(step => {
				const nodeId = asStepNodeId(step);
				if (nodeId == null) {
					return;
				}
				ensureNode(nodeId, asStepNodeName(step), asStepNodeType(step), {topicName: step.topicName});
				if (previousNodeId !== nodeId) {
					if (upstream) {
						// data flows from the step into the chain towards the anchor
						addEdge(nodeId, previousNodeId, PII_EDGE_UPSTREAM);
					} else {
						// data flows from the anchor along the chain to the step
						addEdge(previousNodeId, nodeId, PII_EDGE_DOWNSTREAM);
					}
				}
				previousNodeId = nodeId;
			});
		});
	};
	walkRoutes(report.upstreamRoutes, true);
	walkRoutes(report.downstreamRoutes, false);

	const hasRoutes = (report.upstreamRoutes?.length ?? 0) + (report.downstreamRoutes?.length ?? 0) > 0;

	// fallback: no routes (e.g. mock data), build chains from raw graph edges.
	// direction is approximated by edge kind.
	if (!hasRoutes) {
		(report.graphData?.edges ?? []).forEach(edge => {
			const kind = edge.kind === 'produces' ? PII_EDGE_DOWNSTREAM
				: edge.kind === 'reads_from' ? PII_EDGE_UPSTREAM : PII_EDGE_MAPS_TO;
			addEdge(edge.from, edge.to, kind);
		});
		(report.graphData?.nodes ?? []).forEach((node: PiiGraphNode) => {
			ensureNode(node.id, node.name, node.type, {sensitivity: node.sensitivity});
		});
	}

	assignColumns(nodeMap, edges, termNodeId, hasRoutes);
	assignRows(nodeMap);

	return {nodes: Object.values(nodeMap), edges, hasRoutes};
};

/**
 * Assign columns by BFS from the anchors (term + linked factors, column 0).
 * Downstream edges increase the column, upstream edges decrease it.
 */
const assignColumns = (
	nodeMap: Record<string, PiiLineageDisplayNode>,
	edges: Array<PiiLineageDisplayEdge>,
	termNodeId: string,
	hasRoutes: boolean
): void => {
	const assigned: Record<string, boolean> = {};
	const queue: Array<string> = [];

	Object.values(nodeMap).forEach(node => {
		if (node.type === PII_NODE_TYPE_TERM) {
			node.column = 0;
			assigned[node.id] = true;
			queue.push(node.id);
		}
	});
	// linked factors sit on the anchor column as well
	edges.filter(edge => edge.kind === PII_EDGE_MAPS_TO && edge.source === termNodeId).forEach(edge => {
		const node = nodeMap[edge.target];
		if (node != null && !assigned[node.id]) {
			node.column = 0;
			assigned[node.id] = true;
			queue.push(node.id);
		}
	});

	// adjacency: for downstream edges source -> target means target is one column to the right;
	// for upstream edges source -> target means source is one column to the left (data flows into target)
	const downstreamOf: Record<string, Array<string>> = {};
	const upstreamOf: Record<string, Array<string>> = {};
	const neighbors: Record<string, Array<{ id: string; kind: string }>> = {};
	edges.forEach(edge => {
		(neighbors[edge.source] = neighbors[edge.source] ?? []).push({id: edge.target, kind: edge.kind});
		(neighbors[edge.target] = neighbors[edge.target] ?? []).push({id: edge.source, kind: edge.kind});
		if (edge.kind === PII_EDGE_DOWNSTREAM) {
			(downstreamOf[edge.source] = downstreamOf[edge.source] ?? []).push(edge.target);
		} else if (edge.kind === PII_EDGE_UPSTREAM) {
			(upstreamOf[edge.target] = upstreamOf[edge.target] ?? []).push(edge.source);
		}
	});

	while (queue.length !== 0) {
		const id = queue.shift()!;
		const column = nodeMap[id].column;
		(downstreamOf[id] ?? []).forEach(targetId => {
			const target = nodeMap[targetId];
			if (target != null && !assigned[targetId]) {
				target.column = column + 1;
				assigned[targetId] = true;
				queue.push(targetId);
			}
		});
		(upstreamOf[id] ?? []).forEach(sourceId => {
			const source = nodeMap[sourceId];
			if (source != null && !assigned[sourceId]) {
				source.column = column - 1;
				assigned[sourceId] = true;
				queue.push(sourceId);
			}
		});
		// fallback mode (no routes): chain edges are typed but not anchored,
		// walk remaining neighbors and keep them on the same side approximated by edge kind
		if (!hasRoutes) {
			(neighbors[id] ?? []).forEach(neighbor => {
				const target = nodeMap[neighbor.id];
				if (target != null && !assigned[neighbor.id]) {
					target.column = neighbor.kind === PII_EDGE_MAPS_TO ? column : column - 1;
					assigned[neighbor.id] = true;
					queue.push(neighbor.id);
				}
			});
		}
	}

	// nodes unreachable from anchors (disconnected chains in fallback mode)
	// are placed to the right to avoid overlapping the anchor column
	Object.values(nodeMap).forEach(node => {
		if (!assigned[node.id]) {
			node.column = 1;
			assigned[node.id] = true;
		}
	});
};

/** Assign row indexes within each column, centered vertically */
const assignRows = (nodeMap: Record<string, PiiLineageDisplayNode>): void => {
	const byColumn: Record<number, Array<PiiLineageDisplayNode>> = {};
	Object.values(nodeMap).forEach(node => {
		(byColumn[node.column] = byColumn[node.column] ?? []).push(node);
	});
	Object.values(byColumn).forEach(columnNodes => {
		columnNodes.forEach((node, index) => {
			node.row = index - (columnNodes.length - 1) / 2;
		});
	});
};

/** build the ordered step chain of a route for display, anchor included */
export const buildRouteDisplayChain = (
	route: PiiTraceRoute, upstream: boolean, linkedFactors: Array<PiiLinkedFactor>
): Array<{ name: string; kind: string }> => {
	const steps = route.steps ?? [];
	if (steps.length === 0) {
		return [];
	}
	const first = steps[0];
	const linked = (linkedFactors ?? []).find(
		factor => factor.topicId === first.topicId && factor.factorId === first.factorId);
	const anchorName = linked
		? (linked.factorName || linked.factorId)
		: (first.factorName || first.factorId || '');

	const stepChain = steps
		.filter(step => asStepNodeId(step) != null)
		.map(step => ({name: asStepNodeName(step), kind: asStepNodeType(step)}));

	const anchor = {name: anchorName, kind: PII_NODE_TYPE_FACTOR};
	// upstream routes walk from anchor to sources; display them in data flow order (source -> anchor)
	return upstream ? [...stepChain.slice().reverse(), anchor] : [anchor, ...stepChain];
};
