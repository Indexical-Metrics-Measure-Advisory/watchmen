from typing import Dict, List, Optional, Set

from .metric_lineage_models import LineageNode, LineageNodeType, LineagePath, LineagePathSummary, MetricLineageViewData

DEFAULT_MAX_FIELDS_PER_TABLE = 20


def _find_primary_path(view: MetricLineageViewData) -> Optional[LineagePath]:
    for path in view.paths:
        if path.isPrimary:
            return path
    return view.paths[0] if len(view.paths) != 0 else None


def _primary_path_node_ids(view: MetricLineageViewData) -> Set[str]:
    primary_path = _find_primary_path(view)
    return set(primary_path.nodeIds) if primary_path is not None else set()


def _with_hidden_field_count(node: LineageNode, hidden_count: int) -> LineageNode:
    metadata = dict(node.metadata or {})
    metadata['hiddenFieldCount'] = hidden_count
    return node.model_copy(update={'metadata': metadata})


def apply_fanout_limit(view: MetricLineageViewData, max_fields_per_table: int = DEFAULT_MAX_FIELDS_PER_TABLE) -> MetricLineageViewData:
    """Keep at most max_fields_per_table source fields per source table.

    Fields on the primary path are kept first; the rest are dropped along with their edges and
    path references, and the owning table node records the dropped count in metadata.hiddenFieldCount.
    """
    if max_fields_per_table is None or max_fields_per_table <= 0:
        return view

    node_type_by_id = {node.id: node.type for node in view.nodes}
    field_ids_by_table_id: Dict[str, List[str]] = {}
    for edge in view.edges:
        if node_type_by_id.get(edge.from_) == LineageNodeType.SOURCE_TABLE \
                and node_type_by_id.get(edge.to) == LineageNodeType.SOURCE_FIELD:
            field_ids_by_table_id.setdefault(edge.from_, []).append(edge.to)

    if all(len(field_ids) <= max_fields_per_table for field_ids in field_ids_by_table_id.values()):
        return view

    primary_node_ids = _primary_path_node_ids(view)
    dropped_field_ids: Set[str] = set()
    hidden_count_by_table_id: Dict[str, int] = {}
    for table_id, field_ids in field_ids_by_table_id.items():
        if len(field_ids) <= max_fields_per_table:
            continue
        ordered_field_ids = sorted(set(field_ids), key=lambda field_id: (field_id not in primary_node_ids, field_id))
        dropped = ordered_field_ids[max_fields_per_table:]
        dropped_field_ids.update(dropped)
        hidden_count_by_table_id[table_id] = len(dropped)

    nodes = [
        _with_hidden_field_count(node, hidden_count_by_table_id[node.id])
        if node.id in hidden_count_by_table_id else node
        for node in view.nodes
        if node.id not in dropped_field_ids
    ]
    edges = [
        edge for edge in view.edges
        if edge.from_ not in dropped_field_ids and edge.to not in dropped_field_ids
    ]
    paths = [
        path.model_copy(update={'nodeIds': [node_id for node_id in path.nodeIds if node_id not in dropped_field_ids]})
        for path in view.paths
    ]
    return view.model_copy(update={'nodes': nodes, 'edges': edges, 'paths': paths})


def apply_path_projection(view: MetricLineageViewData, path_id: Optional[str] = None) -> MetricLineageViewData:
    """Return detailed nodes/edges for the primary path (plus the requested path) only.

    Other paths are degraded to id/title/nodeCount summaries; the client fetches their details
    on demand via the pathId parameter.
    """
    if len(view.paths) <= 1:
        return view

    primary_path = _find_primary_path(view)
    loaded_path_ids = {primary_path.id}
    if path_id is not None and any(path.id == path_id for path in view.paths):
        loaded_path_ids.add(path_id)

    loaded_paths = [path for path in view.paths if path.id in loaded_path_ids]
    summaries = [
        LineagePathSummary(id=path.id, title=path.title, nodeCount=len(path.nodeIds), isPrimary=path.isPrimary)
        for path in view.paths
        if path.id not in loaded_path_ids
    ]

    kept_node_ids: Set[str] = set()
    for path in loaded_paths:
        kept_node_ids.update(path.nodeIds)

    nodes = [node for node in view.nodes if node.id in kept_node_ids]
    edges = [edge for edge in view.edges if edge.from_ in kept_node_ids and edge.to in kept_node_ids]
    return view.model_copy(update={
        'nodes': nodes,
        'edges': edges,
        'paths': loaded_paths,
        'pathSummaries': summaries if len(summaries) != 0 else None
    })


def apply_max_nodes(view: MetricLineageViewData, max_nodes: Optional[int] = None) -> MetricLineageViewData:
    """Fallback guard: when the graph exceeds max_nodes, keep the primary path intact and drop
    secondary nodes until the budget is met, flagging the response as truncated."""
    if max_nodes is None or max_nodes <= 0 or len(view.nodes) <= max_nodes:
        return view

    total_node_count = len(view.nodes)
    primary_path = _find_primary_path(view)
    primary_node_ids = list(primary_path.nodeIds) if primary_path is not None else []

    kept_node_ids: Set[str] = set(primary_node_ids)
    budget = max(max_nodes - len(kept_node_ids), 0)
    ordered_candidate_ids: List[str] = []
    for path in view.paths:
        if primary_path is not None and path.id == primary_path.id:
            continue
        ordered_candidate_ids.extend(path.nodeIds)
    ordered_candidate_ids.extend(sorted(node.id for node in view.nodes))

    for node_id in ordered_candidate_ids:
        if budget <= 0:
            break
        if node_id in kept_node_ids:
            continue
        kept_node_ids.add(node_id)
        budget -= 1

    nodes = [node for node in view.nodes if node.id in kept_node_ids]
    edges = [edge for edge in view.edges if edge.from_ in kept_node_ids and edge.to in kept_node_ids]
    paths = []
    for path in view.paths:
        if primary_path is not None and path.id == primary_path.id:
            paths.append(path)
            continue
        paths.append(path.model_copy(update={
            'nodeIds': [node_id for node_id in path.nodeIds if node_id in kept_node_ids]
        }))
    return view.model_copy(update={
        'nodes': nodes,
        'edges': edges,
        'paths': paths,
        'truncated': True,
        'totalNodeCount': total_node_count
    })
