from typing import Dict, List, Optional, Set

from .metric_lineage_models import LineageEdge, LineageEdgeKind, LineageGroup, LineageNode, LineageNodeType, \
    LineagePath, LineageRoot, LineageRoute, LineageStage, MetricLineageStatus, MetricLineageSummary, \
    MetricLineageViewData


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
        source_table_count = len([node for node in nodes if node.type == LineageNodeType.SOURCE_TABLE])
        route_count = len(self._paths)
        max_hop_depth = max([len(path.nodeIds) - 1 for path in self._paths.values()], default=0)
        raw_topic_count = len([
            node for node in nodes
            if node.type == LineageNodeType.TOPIC and (
                node.badge == 'raw'
                or self._read_metadata(node, 'topicType') == 'raw'
                or self._read_metadata(node, 'type') == 'raw'
            )
        ])
        return MetricLineageSummary(
            metricType=metric_type or 'unknown',
            semanticModelCount=semantic_model_count,
            topicCount=topic_count,
            pipelineCount=pipeline_count,
            sourceFieldCount=source_field_count,
            sourceTableCount=source_table_count,
            routeCount=route_count,
            maxHopDepth=max_hop_depth,
            rawTopicCount=raw_topic_count
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
        routes = sorted(self._build_routes(), key=lambda route: route.id)
        groups = sorted(self._build_groups(), key=lambda group: (group.stage, group.id))
        roots = sorted(self._build_roots(), key=lambda root: (root.label, root.nodeId))
        diagnostics = sorted(self._diagnostics)
        return MetricLineageViewData(
            metricName=metric_name,
            status=self._build_status(),
            summary=self._build_summary(metric_type),
            nodes=nodes,
            edges=edges,
            paths=paths,
            routes=routes if len(routes) != 0 else None,
            groups=groups if len(groups) != 0 else None,
            roots=roots if len(roots) != 0 else None,
            diagnostics=diagnostics if len(diagnostics) != 0 else None
        )

    def _build_routes(self) -> List[LineageRoute]:
        routes: List[LineageRoute] = []
        for path in self._paths.values():
            path_nodes = [self._nodes[node_id] for node_id in path.nodeIds if node_id in self._nodes]
            reaches_source = any(node.stage == LineageStage.SOURCE for node in path_nodes)
            reaches_raw_topic = any(
                node.type == LineageNodeType.TOPIC and (
                    node.badge == 'raw'
                    or self._read_metadata(node, 'topicType') == 'raw'
                    or self._read_metadata(node, 'type') == 'raw'
                )
                for node in path_nodes
            )
            routes.append(LineageRoute(
                id=path.id,
                title=path.title,
                nodeIds=path.nodeIds,
                hopDepth=max(len(path.nodeIds) - 1, 0),
                reachesSource=reaches_source,
                reachesRawTopic=reaches_raw_topic,
                isPrimary=path.isPrimary
            ))
        return routes

    def _build_groups(self) -> List[LineageGroup]:
        path_node_ids = set()
        for path in self._paths.values():
            for node_id in path.nodeIds:
                path_node_ids.add(node_id)

        groups: List[LineageGroup] = []
        for stage in LineageStage:
            stage_nodes = [
                node for node in self._nodes.values()
                if node.stage == stage
            ]
            if len(stage_nodes) == 0:
                continue
            stage_nodes = sorted(stage_nodes, key=lambda node: (node.type, node.name, node.id))
            active_nodes = [node for node in stage_nodes if node.id in path_node_ids]
            preview_nodes = active_nodes[:3] if len(active_nodes) != 0 else stage_nodes[:3]
            groups.append(LineageGroup(
                id=f'group-{stage.value}',
                stage=stage,
                title=f'{stage.value.title()} Group',
                totalNodes=len(stage_nodes),
                activeNodes=len(active_nodes),
                collapsedNodeCount=max(len(stage_nodes) - len(preview_nodes), 0),
                previewNodeIds=[node.id for node in preview_nodes]
            ))
        return groups

    def _build_roots(self) -> List[LineageRoot]:
        route_ids_by_node_id: Dict[str, List[str]] = {}
        hop_depth_by_node_id: Dict[str, int] = {}
        for path in self._paths.values():
            for index, node_id in enumerate(path.nodeIds):
                if node_id not in route_ids_by_node_id:
                    route_ids_by_node_id[node_id] = []
                route_ids_by_node_id[node_id].append(path.id)
                hop_depth_by_node_id[node_id] = max(hop_depth_by_node_id.get(node_id, 0), index)

        roots: List[LineageRoot] = []
        for node in self._nodes.values():
            if node.type not in (LineageNodeType.SOURCE_TABLE, LineageNodeType.SOURCE_FIELD, LineageNodeType.TOPIC):
                continue
            if node.type == LineageNodeType.TOPIC and not (
                node.badge == 'raw'
                or self._read_metadata(node, 'topicType') == 'raw'
                or self._read_metadata(node, 'type') == 'raw'
            ):
                continue
            roots.append(LineageRoot(
                nodeId=node.id,
                label=node.label or node.name,
                nodeType=node.type,
                routeIds=sorted(route_ids_by_node_id.get(node.id, [])),
                hopDepth=hop_depth_by_node_id.get(node.id, 0)
            ))
        return roots

    @staticmethod
    def _read_metadata(node: LineageNode, key: str):
        if node.metadata is None:
            return None
        return node.metadata.get(key)

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
