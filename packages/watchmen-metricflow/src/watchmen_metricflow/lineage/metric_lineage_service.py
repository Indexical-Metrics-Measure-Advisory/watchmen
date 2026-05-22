from typing import List, Optional, TYPE_CHECKING

from watchmen_auth import PrincipalService
from watchmen_metricflow.model.metrics import MetricWithCategory
from watchmen_metricflow.model.semantic import Measure, SemanticModel
from watchmen_model.admin import Factor, Pipeline, Topic

from .metric_lineage_assembler import MetricLineageAssembler
from .metric_lineage_models import LineageEdgeKind, LineageNodeType, LineageStage, MetricLineageBranch, \
    MetricLineageViewData

if TYPE_CHECKING:
    from .metric_lineage_resolver import MetricLineageResolver


class MetricLineageService:
    def __init__(self, principal_service: PrincipalService, resolver: Optional['MetricLineageResolver'] = None):
        self.principal_service = principal_service
        if resolver is None:
            from .metric_lineage_resolver import MetricLineageResolver
            resolver = MetricLineageResolver(principal_service)
        self.resolver = resolver

    def get_metric_lineage(self, metric_name: str, tenant_id: str, include_diagnostics: bool = True) -> MetricLineageViewData:
        assembler = MetricLineageAssembler()
        metric = self.resolver.resolve_metric(metric_name, tenant_id)
        if metric is None:
            if include_diagnostics:
                assembler.add_diagnostics(['Metric not found.', 'No lineage graph could be assembled.'])
            return assembler.build(metric_name, 'unknown')

        metric_type = self.resolver.normalize_metric_type(metric)
        root_metric_node = MetricLineageAssembler.node(
            node_id=self.metric_node_id(metric.name),
            stage=LineageStage.METRIC,
            node_type=LineageNodeType.METRIC,
            name=metric.name,
            label=metric.label,
            description=metric.description,
            badge=metric_type,
            metadata=self.build_metric_metadata(metric)
        )
        assembler.add_node(root_metric_node)

        branches = self.resolver.resolve_metric_branches(metric, tenant_id)
        if len(branches) == 0:
            if include_diagnostics:
                assembler.add_diagnostic('Metric exists but no lineage branch could be expanded.')
            return assembler.build(metric_name, metric_type)

        primary_path_id: Optional[str] = None
        for index, branch in enumerate(branches):
            path_id = f'path-{branch.id}'
            if primary_path_id is None and branch.isPrimaryCandidate:
                primary_path_id = path_id
            self._assemble_branch(
                assembler=assembler,
                metric=metric,
                branch=branch,
                path_id=path_id,
                is_primary=False,
                include_diagnostics=include_diagnostics,
                tenant_id=tenant_id
            )

        assembler.choose_primary_path(primary_path_id)

        return assembler.build(metric_name, metric_type)

    def _assemble_branch(
            self, assembler: MetricLineageAssembler, metric: MetricWithCategory, branch: MetricLineageBranch, path_id: str,
            is_primary: bool, include_diagnostics: bool, tenant_id: str
    ) -> None:
        path_node_ids: List[str] = [self.metric_node_id(metric.name)]
        previous_node_id = self.metric_node_id(metric.name)

        for metric_ref_name in branch.metricRefChain:
            metric_ref_node = MetricLineageAssembler.node(
                node_id=self.metric_ref_node_id(metric_ref_name),
                stage=LineageStage.METRIC,
                node_type=LineageNodeType.METRIC_REF,
                name=metric_ref_name,
                label=metric_ref_name
            )
            assembler.add_node(metric_ref_node)
            assembler.add_edge(MetricLineageAssembler.edge(
                from_id=previous_node_id, to_id=metric_ref_node.id, kind=LineageEdgeKind.DERIVED_FROM, path_id=path_id))
            previous_node_id = metric_ref_node.id
            path_node_ids.append(metric_ref_node.id)

        semantic_model, measure, semantic_diagnostics = self.resolver.resolve_semantic_for_branch(branch, tenant_id)
        if include_diagnostics:
            assembler.add_diagnostics(semantic_diagnostics)
        if semantic_model is None or measure is None:
            assembler.add_path(MetricLineageAssembler.path(path_id, branch.title, path_node_ids, is_primary))
            return

        measure_name = self._read_attr(measure, 'name')
        measure_label = self._read_attr(measure, 'label') or measure_name
        measure_description = self._read_attr(measure, 'description')
        measure_expr = self._read_attr(measure, 'expr')
        measure_agg = self._read_attr(measure, 'agg')

        semantic_node = MetricLineageAssembler.node(
            node_id=self.semantic_model_node_id(semantic_model.name),
            stage=LineageStage.SEMANTIC,
            node_type=LineageNodeType.SEMANTIC_MODEL,
            name=semantic_model.name,
            label=semantic_model.name,
            description=semantic_model.description,
            metadata={'sourceType': semantic_model.sourceType, 'topicId': semantic_model.topicId}
        )
        measure_node = MetricLineageAssembler.node(
            node_id=self.semantic_measure_node_id(semantic_model.name, measure_name),
            stage=LineageStage.SEMANTIC,
            node_type=LineageNodeType.SEMANTIC_MEASURE,
            name=measure_name,
            label=measure_label,
            description=measure_description,
            metadata={'expr': measure_expr, 'agg': measure_agg}
        )
        assembler.add_node(semantic_node)
        assembler.add_node(measure_node)
        assembler.add_edge(MetricLineageAssembler.edge(
            from_id=previous_node_id, to_id=semantic_node.id, kind=LineageEdgeKind.DEFINES, path_id=path_id))
        assembler.add_edge(MetricLineageAssembler.edge(
            from_id=semantic_node.id, to_id=measure_node.id, kind=LineageEdgeKind.DEFINES, path_id=path_id))
        previous_node_id = measure_node.id
        path_node_ids.extend([semantic_node.id, measure_node.id])

        topic = self.resolver.resolve_topic(semantic_model)
        if topic is None:
            if include_diagnostics:
                assembler.add_diagnostic('Semantic model exists but topicId is missing or topic could not be found.')
            assembler.add_path(MetricLineageAssembler.path(path_id, branch.title, path_node_ids, is_primary))
            return

        topic_node = MetricLineageAssembler.node(
            node_id=self.topic_node_id(topic.name),
            stage=LineageStage.TOPIC,
            node_type=LineageNodeType.TOPIC,
            name=topic.name,
            label=topic.name,
            description=topic.description
        )
        assembler.add_node(topic_node)
        assembler.add_edge(MetricLineageAssembler.edge(
            from_id=semantic_node.id, to_id=topic_node.id, kind=LineageEdgeKind.MAPS_TO, path_id=path_id))
        previous_node_id = topic_node.id
        path_node_ids.append(topic_node.id)

        factor = self.resolver.resolve_topic_factor(topic, measure)
        if factor is not None:
            factor_node = MetricLineageAssembler.node(
                node_id=self.topic_factor_node_id(topic.name, factor.name),
                stage=LineageStage.TOPIC,
                node_type=LineageNodeType.TOPIC_FACTOR,
                name=factor.name,
                label=factor.label or factor.name,
                description=factor.description
            )
            assembler.add_node(factor_node)
            assembler.add_edge(MetricLineageAssembler.edge(
                from_id=topic_node.id, to_id=factor_node.id, kind=LineageEdgeKind.MAPS_TO, path_id=path_id))
            previous_node_id = factor_node.id
            path_node_ids.append(factor_node.id)
        elif include_diagnostics:
            assembler.add_diagnostic(f'Topic factor could not be matched for measure[{measure_name}].')

        pipelines = self.resolver.resolve_pipelines(topic, tenant_id)
        matched_pipelines, pipeline_diagnostics = self.resolver.resolve_pipeline_factor_dependencies(pipelines, topic, factor)
        if include_diagnostics:
            assembler.add_diagnostics(pipeline_diagnostics)
        if len(matched_pipelines) == 0:
            if include_diagnostics:
                assembler.add_diagnostic(f'No related pipeline was found for topic[{topic.name}].')
            assembler.add_path(MetricLineageAssembler.path(path_id, branch.title, path_node_ids, is_primary))
            return

        primary_pipeline = matched_pipelines[0]
        for pipeline in matched_pipelines:
            pipeline_node = MetricLineageAssembler.node(
                node_id=self.pipeline_node_id(pipeline.name or pipeline.pipelineId),
                stage=LineageStage.PIPELINE,
                node_type=LineageNodeType.PIPELINE,
                name=pipeline.name or pipeline.pipelineId,
                label=pipeline.name or pipeline.pipelineId,
                metadata={'topicId': pipeline.topicId, 'enabled': pipeline.enabled, 'validated': pipeline.validated}
            )
            assembler.add_node(pipeline_node)
            assembler.add_edge(MetricLineageAssembler.edge(
                from_id=previous_node_id if pipeline == primary_pipeline else topic_node.id,
                to_id=pipeline_node.id,
                kind=LineageEdgeKind.READS_FROM,
                path_id=path_id
            ))
        primary_pipeline_node_id = self.pipeline_node_id(primary_pipeline.name or primary_pipeline.pipelineId)
        previous_node_id = primary_pipeline_node_id
        path_node_ids.append(primary_pipeline_node_id)

        source_table_name, source_field_name = self.resolver.resolve_source(semantic_model, measure)
        if source_table_name is None:
            if include_diagnostics:
                assembler.add_diagnostic('Source table lineage unavailable.')
            assembler.add_path(MetricLineageAssembler.path(path_id, branch.title, path_node_ids, is_primary))
            return

        source_table_node = MetricLineageAssembler.node(
            node_id=self.source_table_node_id(source_table_name),
            stage=LineageStage.SOURCE,
            node_type=LineageNodeType.SOURCE_TABLE,
            name=source_table_name,
            label=source_table_name
        )
        assembler.add_node(source_table_node)
        assembler.add_edge(MetricLineageAssembler.edge(
            from_id=previous_node_id, to_id=source_table_node.id, kind=LineageEdgeKind.PRODUCES, path_id=path_id))
        previous_node_id = source_table_node.id
        path_node_ids.append(source_table_node.id)

        if source_field_name is not None:
            source_field_node = MetricLineageAssembler.node(
                node_id=self.source_field_node_id(source_table_name, source_field_name),
                stage=LineageStage.SOURCE,
                node_type=LineageNodeType.SOURCE_FIELD,
                name=source_field_name,
                label=source_field_name,
                metadata={'expr': measure_expr}
            )
            assembler.add_node(source_field_node)
            assembler.add_edge(MetricLineageAssembler.edge(
                from_id=source_table_node.id, to_id=source_field_node.id, kind=LineageEdgeKind.MAPS_TO, path_id=path_id))
            previous_node_id = source_field_node.id
            path_node_ids.append(source_field_node.id)
        elif include_diagnostics:
            assembler.add_diagnostic('Source field resolved from semantic measure expression only.')

        assembler.add_path(MetricLineageAssembler.path(path_id, branch.title, path_node_ids, is_primary))

    @staticmethod
    def build_metric_metadata(metric: MetricWithCategory) -> dict:
        params = MetricLineageService._read_attr(metric, 'type_params') or {}
        metadata = {}
        measure = MetricLineageService._read_attr(params, 'measure')
        numerator = MetricLineageService._read_attr(params, 'numerator')
        denominator = MetricLineageService._read_attr(params, 'denominator')
        metrics = MetricLineageService._read_attr(params, 'metrics') or []
        expr = MetricLineageService._read_attr(params, 'expr')
        if measure is not None:
            metadata['measure'] = MetricLineageService._read_attr(measure, 'name')
        if numerator is not None:
            metadata['numerator'] = MetricLineageService._read_attr(numerator, 'name')
        if denominator is not None:
            metadata['denominator'] = MetricLineageService._read_attr(denominator, 'name')
        if len(metrics) != 0:
            metadata['metrics'] = [MetricLineageService._read_attr(metric_ref, 'name') for metric_ref in metrics]
        if expr is not None:
            metadata['expr'] = expr
        return metadata

    @staticmethod
    def _read_attr(instance, name: str):
        if instance is None:
            return None
        if isinstance(instance, dict):
            return instance.get(name)
        return getattr(instance, name, None)

    @staticmethod
    def metric_node_id(metric_name: str) -> str:
        return f'metric-{metric_name}'

    @staticmethod
    def metric_ref_node_id(metric_name: str) -> str:
        return f'metric-ref-{metric_name}'

    @staticmethod
    def semantic_model_node_id(model_name: str) -> str:
        return f'semantic-{model_name}'

    @staticmethod
    def semantic_measure_node_id(model_name: str, measure_name: str) -> str:
        return f'semantic-measure-{model_name}-{measure_name}'

    @staticmethod
    def topic_node_id(topic_name: str) -> str:
        return f'topic-{topic_name}'

    @staticmethod
    def topic_factor_node_id(topic_name: str, factor_name: str) -> str:
        return f'topic-factor-{topic_name}-{factor_name}'

    @staticmethod
    def pipeline_node_id(pipeline_name: str) -> str:
        return f'pipeline-{pipeline_name}'

    @staticmethod
    def source_table_node_id(table_name: str) -> str:
        return f'source-table-{table_name}'

    @staticmethod
    def source_field_node_id(table_name: str, field_name: str) -> str:
        return f'source-field-{table_name}-{field_name}'
