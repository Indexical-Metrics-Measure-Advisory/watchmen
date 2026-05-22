from typing import Dict, List, Optional, Set

from .metric_lineage_models import LineageEdge, LineageEdgeKind, LineageNode, LineageNodeType, LineagePath, \
    LineageStage, MetricLineageStatus, MetricLineageSummary, MetricLineageViewData


class MetricLineageAssembler:
    REQUIRED_STAGES = {
        LineageStage.METRIC,
        LineageStage.SEMANTIC,
        LineageStage.TOPIC,
        LineageStage.PIPELINE,
        LineageStage.SOURCE
    }

    def __init__(self):
        self._nodes: Dict[str, LineageNode] = {}
        self._edges: Dict[str, LineageEdge] = {}
        self._paths: Dict[str, LineagePath] = {}
        self._diagnostics: Set[str] = set()

    def add_node(self, node: Optional[LineageNode]) -> Optional[LineageNode]:
        if node is None:
            return None
        self._nodes[node.id] = node
        return node

    def add_edge(self, edge: Optional[LineageEdge]) -> Optional[LineageEdge]:
        if edge is None:
            return None
        self._edges[edge.id] = edge
        return edge

    def add_path(self, path: Optional[LineagePath]) -> Optional[LineagePath]:
        if path is None:
            return None
        if len(path.nodeIds) == 0:
            return None
        self._paths[path.id] = path
        return path

    def mark_primary_path(self, path_id: str) -> None:
        for current_path in self._paths.values():
            current_path.isPrimary = current_path.id == path_id

    def choose_primary_path(self, preferred_path_id: Optional[str] = None) -> Optional[str]:
        if len(self._paths) == 0:
            return None

        scored_paths = sorted(
            self._paths.values(),
            key=lambda path: self._path_sort_key(path, preferred_path_id)
        )
        primary_path = scored_paths[0]
        self.mark_primary_path(primary_path.id)
        return primary_path.id

    def add_diagnostic(self, diagnostic: Optional[str]) -> None:
        if diagnostic is None:
            return
        message = diagnostic.strip()
        if len(message) != 0:
            self._diagnostics.add(message)

    def add_diagnostics(self, diagnostics: Optional[List[str]]) -> None:
        for diagnostic in diagnostics or []:
            self.add_diagnostic(diagnostic)

    def _build_summary(self, metric_type: str) -> MetricLineageSummary:
        nodes = list(self._nodes.values())
        semantic_model_count = len([node for node in nodes if node.type == LineageNodeType.SEMANTIC_MODEL])
        topic_count = len([node for node in nodes if node.type == LineageNodeType.TOPIC])
        pipeline_count = len([node for node in nodes if node.type == LineageNodeType.PIPELINE])
        source_field_count = len([node for node in nodes if node.type == LineageNodeType.SOURCE_FIELD])
        return MetricLineageSummary(
            metricType=metric_type or 'unknown',
            semanticModelCount=semantic_model_count,
            topicCount=topic_count,
            pipelineCount=pipeline_count,
            sourceFieldCount=source_field_count
        )

    def _build_status(self) -> MetricLineageStatus:
        if len(self._paths) == 0 or len(self._nodes) == 0:
            return MetricLineageStatus.UNRESOLVED

        stages = {node.stage for node in self._nodes.values()}
        if self.REQUIRED_STAGES.issubset(stages):
            return MetricLineageStatus.RESOLVED
        return MetricLineageStatus.PARTIAL

    def _path_sort_key(self, path: LineagePath, preferred_path_id: Optional[str]):
        path_stages = {
            self._nodes[node_id].stage for node_id in path.nodeIds if node_id in self._nodes
        }
        is_complete = self.REQUIRED_STAGES.issubset(path_stages)
        return (
            -len(path.nodeIds),
            -int(is_complete),
            -int(path.id == preferred_path_id),
            path.id
        )

    def build(self, metric_name: str, metric_type: str) -> MetricLineageViewData:
        nodes = sorted(self._nodes.values(), key=lambda node: (node.stage, node.type, node.name, node.id))
        edges = sorted(self._edges.values(), key=lambda edge: (edge.pathId, edge.from_, edge.to, edge.kind, edge.id))
        paths = sorted(self._paths.values(), key=lambda path: path.id)
        diagnostics = sorted(self._diagnostics)
        return MetricLineageViewData(
            metricName=metric_name,
            status=self._build_status(),
            summary=self._build_summary(metric_type),
            nodes=nodes,
            edges=edges,
            paths=paths,
            diagnostics=diagnostics if len(diagnostics) != 0 else None
        )

    @staticmethod
    def node(
            node_id: str, stage: LineageStage, node_type: LineageNodeType, name: str, label: Optional[str] = None,
            description: Optional[str] = None, badge: Optional[str] = None,
            metadata: Optional[Dict[str, object]] = None
    ) -> LineageNode:
        return LineageNode(
            id=node_id, stage=stage, type=node_type, name=name, label=label, description=description, badge=badge,
            metadata=metadata
        )

    @staticmethod
    def edge(from_id: str, to_id: str, kind: LineageEdgeKind, path_id: str) -> LineageEdge:
        edge_id = f'{path_id}:{from_id}->{to_id}:{kind.value}'
        return LineageEdge(id=edge_id, **{'from': from_id}, to=to_id, kind=kind, pathId=path_id)

    @staticmethod
    def path(path_id: str, title: str, node_ids: List[str], is_primary: bool = False) -> LineagePath:
        return LineagePath(id=path_id, title=title, nodeIds=node_ids, isPrimary=is_primary or None)
