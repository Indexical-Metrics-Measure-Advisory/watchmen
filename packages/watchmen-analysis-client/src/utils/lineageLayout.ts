import dagre from '@dagrejs/dagre';
import type { LineageEdge, LineageNode } from '@/model/metricLineage';

// Shared card geometry: lineage node cards render at a fixed width, heights vary
// slightly with content so a stable estimate keeps dagre ranks readable.
export const LINEAGE_NODE_WIDTH = 220;
export const LINEAGE_NODE_HEIGHT = 72;

export interface LayoutNodeInput {
	id: string;
	width?: number;
	height?: number;
}

export interface LayoutEdgeInput {
	source: string;
	target: string;
}

export interface LayoutPosition {
	x: number;
	y: number;
}

/**
 * Layered dagre layout. Edges must already point in the desired visual direction
 * (left -> right for LR). Returns top-left positions as React Flow expects them
 * (dagre reports node centers).
 */
export const layoutWithDagre = (
	nodes: LayoutNodeInput[],
	edges: LayoutEdgeInput[],
	direction: 'LR' | 'TB' = 'LR'
): Map<string, LayoutPosition> => {
	const graph = new dagre.graphlib.Graph();
	graph.setDefaultEdgeLabel(() => ({}));
	graph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 120, marginx: 24, marginy: 24 });

	nodes.forEach(node => {
		graph.setNode(node.id, {
			width: node.width ?? LINEAGE_NODE_WIDTH,
			height: node.height ?? LINEAGE_NODE_HEIGHT,
		});
	});
	edges.forEach(edge => {
		if (graph.hasNode(edge.source) && graph.hasNode(edge.target) && edge.source !== edge.target) {
			graph.setEdge(edge.source, edge.target);
		}
	});

	dagre.layout(graph);

	const positions = new Map<string, LayoutPosition>();
	nodes.forEach(node => {
		const laidOut = graph.node(node.id);
		const width = node.width ?? LINEAGE_NODE_WIDTH;
		const height = node.height ?? LINEAGE_NODE_HEIGHT;
		positions.set(node.id, { x: laidOut.x - width / 2, y: laidOut.y - height / 2 });
	});
	return positions;
};

export interface NodeHeightHints {
	/** Label likely wraps to two lines at the fixed card width. */
	twoLineLabel?: boolean;
	/** Card renders the collapsible fields toggle button. */
	hasFieldToggle?: boolean;
	/** Card renders the "N more fields" hint line. */
	hasHiddenFieldsLabel?: boolean;
}

/**
 * Estimate the rendered card height so dagre can pack ranks without overlap.
 * The card is fixed at 220px wide; height grows with content (2-line label,
 * fields toggle button, hidden-fields hint). Keeps in sync with LineageNodeView.
 */
export const estimateLineageNodeHeight = (hints: NodeHeightHints): number => {
	// py-2 (16) + one label line (20) + name line (15) + breathing room
	let height = 54;
	if (hints.twoLineLabel) {
		height += 20;
	}
	if (hints.hasFieldToggle) {
		height += 34;
	}
	if (hints.hasHiddenFieldsLabel) {
		height += 19;
	}
	return height;
};

export interface TraversalResult {
	nodeIds: Set<string>;
	edgeIds: Set<string>;
}

const buildAdjacency = (edges: Array<Pick<LineageEdge, 'id' | 'from' | 'to'>>) => {
	const adjacency = new Map<string, Array<{ edgeId: string; otherId: string }>>();
	edges.forEach(edge => {
		if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
		if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
		adjacency.get(edge.from)!.push({ edgeId: edge.id, otherId: edge.to });
		adjacency.get(edge.to)!.push({ edgeId: edge.id, otherId: edge.from });
	});
	return adjacency;
};

/**
 * Bidirectional BFS from the given node: every node/edge reachable when edges are
 * treated as undirected, i.e. the full upstream + downstream closure used by focus.
 */
export const computeFocusClosure = (
	nodeId: string,
	edges: Array<Pick<LineageEdge, 'id' | 'from' | 'to'>>
): TraversalResult => {
	const adjacency = buildAdjacency(edges);
	const nodeIds = new Set<string>([nodeId]);
	const edgeIds = new Set<string>();
	const queue = [nodeId];
	while (queue.length > 0) {
		const current = queue.shift()!;
		(adjacency.get(current) || []).forEach(({ edgeId, otherId }) => {
			edgeIds.add(edgeId);
			if (!nodeIds.has(otherId)) {
				nodeIds.add(otherId);
				queue.push(otherId);
			}
		});
	}
	return { nodeIds, edgeIds };
};

/** One-hop neighborhood of a node (the node itself included), used for hover highlight. */
export const computeImmediateNeighbors = (
	nodeId: string,
	edges: Array<Pick<LineageEdge, 'id' | 'from' | 'to'>>
): TraversalResult => {
	const nodeIds = new Set<string>([nodeId]);
	const edgeIds = new Set<string>();
	edges.forEach(edge => {
		if (edge.from === nodeId || edge.to === nodeId) {
			edgeIds.add(edge.id);
			nodeIds.add(edge.from);
			nodeIds.add(edge.to);
		}
	});
	return { nodeIds, edgeIds };
 };

export interface ChainCollapseResult {
	collapsed: boolean;
	/** Node ids still rendered, in original path order (head + tail segments). */
	visibleNodeIds: string[];
	/** Middle segment folded into the summary chip, in original path order. */
	hiddenNodeIds: string[];
}

/**
 * Collapse the middle of a long active path into a summary chip so the rendered
 * chain stays scannable. The first and last segments are always kept; the folded
 * segment is typically the alternating topic -> pipeline hops in the middle.
 */
export const collapseLongChain = (
	pathNodeIds: string[],
	nodesById: Map<string, LineageNode>,
	maxVisibleHops = 8
): ChainCollapseResult => {
	const existingIds = pathNodeIds.filter(id => nodesById.has(id));
	if (existingIds.length <= maxVisibleHops) {
		return { collapsed: false, visibleNodeIds: existingIds, hiddenNodeIds: [] };
	}
	// Reserve one visible slot for the summary chip itself.
	const headCount = Math.ceil((maxVisibleHops - 1) / 2);
	const tailCount = maxVisibleHops - 1 - headCount;
	return {
		collapsed: true,
		visibleNodeIds: [...existingIds.slice(0, headCount), ...existingIds.slice(existingIds.length - tailCount)],
		hiddenNodeIds: existingIds.slice(headCount, existingIds.length - tailCount),
	};
};
