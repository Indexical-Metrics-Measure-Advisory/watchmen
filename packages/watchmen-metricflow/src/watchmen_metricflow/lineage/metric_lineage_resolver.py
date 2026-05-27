import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Set, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.metrics import MeasureReference, MetricRef, MetricType, MetricWithCategory
from watchmen_metricflow.model.semantic import Measure, SemanticModel
from watchmen_metricflow.util import trans_readonly
from watchmen_model.admin import Factor, Pipeline, PipelineAction, PipelineStage, PipelineUnit, Topic
from watchmen_model.admin.pipeline_action_read import ReadFactorAction, ReadFactorsAction, ReadRowAction, ReadRowsAction
from watchmen_model.admin.pipeline_action_system import CopyToMemoryAction
from watchmen_model.admin.pipeline_action_write import InsertOrMergeRowAction, InsertRowAction, MappingFactor, \
    MergeRowAction, WriteFactorAction
from watchmen_model.common import ComputedParameter, Parameter, ParameterCondition, ParameterExpression, \
    ParameterJoint, TopicFactorParameter

@dataclass
class UpstreamDependency:
    topic_id: Optional[str]
    factor_id: Optional[str] = None


@dataclass
class UpstreamTraceStep:
    kind: str
    pipeline: Optional[Pipeline] = None
    topic: Optional[Topic] = None
    factor: Optional[Factor] = None
    source_table_name: Optional[str] = None
    source_field_name: Optional[str] = None


@dataclass
class UpstreamTraceRoute:
    id_suffix: str
    title: str
    steps: List[UpstreamTraceStep] = field(default_factory=list)
    diagnostics: List[str] = field(default_factory=list)


from .metric_lineage_models import MetricLineageBranch


class MetricLineageResolver:
    SIMPLE_FIELD_PATTERN = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
    LAST_NAME_PATTERN = re.compile(r'([A-Za-z_][A-Za-z0-9_]*)$')

    def __init__(self, principal_service: PrincipalService):
        self.principal_service = principal_service
        self._metric_service = MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self._semantic_service = SemanticModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self._topic_service = TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self._pipeline_service = PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self._semantic_models_cache: Optional[List[SemanticModel]] = None
        self._metric_cache: Dict[str, Optional[MetricWithCategory]] = {}
        self._topic_cache: Dict[str, Optional[Topic]] = {}
        self._all_pipelines_cache: Optional[List[Pipeline]] = None

    def resolve_metric(self, metric_name: str, tenant_id: str) -> Optional[MetricWithCategory]:
        cached = self._metric_cache.get(metric_name)
        if metric_name in self._metric_cache:
            return cached

        def load() -> Optional[MetricWithCategory]:
            return self._metric_service.find_by_name(metric_name, tenant_id)

        metric = trans_readonly(self._metric_service, load)
        self._metric_cache[metric_name] = metric
        return metric

    def resolve_metric_branches(self, metric: MetricWithCategory, tenant_id: str) -> List[MetricLineageBranch]:
        return self._build_branches_for_metric(metric, tenant_id, {metric.name}, prefix='primary', title_prefix='')

    def resolve_semantic_for_branch(
            self, branch: MetricLineageBranch, tenant_id: str
    ) -> Tuple[Optional[SemanticModel], Optional[Measure], List[str]]:
        measure_name = branch.measureName
        if measure_name is None:
            unresolved_metric_name = branch.metricRefChain[-1] if len(branch.metricRefChain) != 0 else branch.metricRefName
            if unresolved_metric_name is not None:
                if self.resolve_metric(unresolved_metric_name, tenant_id) is None:
                    return None, None, [f'Referenced metric[{unresolved_metric_name}] was not found in metric metadata.']
                return None, None, [
                    f'Referenced metric[{unresolved_metric_name}] could not be expanded to a terminal measure reference.'
                ]
            return None, None, ['Branch does not contain a measure reference.']

        matches: List[Tuple[SemanticModel, Measure]] = []
        for semantic_model in self._load_semantic_models(tenant_id):
            measure = self._find_measure_by_name(semantic_model, measure_name)
            if measure is not None:
                matches.append((semantic_model, measure))

        if len(matches) == 0:
            return None, None, [f'Semantic measure[{measure_name}] was not found in semantic metadata.']

        matches.sort(key=lambda item: item[0].name)
        diagnostics = []
        if len(matches) > 1:
            diagnostics.append(
                f'Semantic measure[{measure_name}] matched multiple semantic models, picked[{matches[0][0].name}].')
        return matches[0][0], matches[0][1], diagnostics

    def resolve_topic(self, semantic_model: Optional[SemanticModel]) -> Optional[Topic]:
        topic_id = self._read_attr(semantic_model, 'topicId')
        if semantic_model is None or topic_id is None:
            return None

        def load() -> Optional[Topic]:
            return self._topic_service.find_by_id(topic_id)

        return trans_readonly(self._topic_service, load)

    def resolve_topic_factor(self, topic: Optional[Topic], measure: Optional[Measure]) -> Optional[Factor]:
        if topic is None or measure is None:
            return None
        measure_name = self._read_attr(measure, 'name')
        for factor in sorted(topic.factors or [], key=lambda item: item.name or ''):
            if factor.name == measure_name:
                return factor
        candidates = self.extract_field_candidates(self._read_attr(measure, 'expr'))
        for candidate in candidates:
            for factor in sorted(topic.factors or [], key=lambda item: item.name or ''):
                if factor.name == candidate:
                    return factor
        return None

    def resolve_pipelines(self, topic: Optional[Topic], tenant_id: str) -> List[Pipeline]:
        if topic is None or topic.topicId is None:
            return []

        def load() -> List[Pipeline]:
            return self._pipeline_service.find_by_topic_id(topic.topicId, tenant_id)

        pipelines = trans_readonly(self._pipeline_service, load)
        return sorted(
            pipelines,
            key=lambda pipeline: (
                not bool(pipeline.enabled), not bool(pipeline.validated), pipeline.name or '', pipeline.pipelineId or '')
        )

    def resolve_topic_by_id(self, topic_id: Optional[str]) -> Optional[Topic]:
        if topic_id is None:
            return None
        if topic_id in self._topic_cache:
            return self._topic_cache.get(topic_id)

        def load() -> Optional[Topic]:
            return self._topic_service.find_by_id(topic_id)

        topic = trans_readonly(self._topic_service, load)
        self._topic_cache[topic_id] = topic
        return topic

    def resolve_topic_factor_by_id(self, topic: Optional[Topic], factor_id: Optional[str]) -> Optional[Factor]:
        if topic is None or factor_id is None:
            return None
        for factor in topic.factors or []:
            if factor.factorId == factor_id:
                return factor
        return None

    def trace_upstream_routes(
            self, topic: Optional[Topic], factor: Optional[Factor], semantic_model: Optional[SemanticModel],
            measure: Optional[Measure], tenant_id: str
    ) -> List[UpstreamTraceRoute]:
        if topic is None:
            return []

        routes = self._trace_upstream_from_topic(
            topic=topic,
            factor=factor,
            tenant_id=tenant_id,
            visited_topic_keys=set(),
            visited_pipeline_ids=set()
        )
        if len(routes) != 0:
            return routes

        source_table_name, source_field_name = self.resolve_source(semantic_model, measure)
        if source_table_name is None:
            return []
        diagnostics = ['Source lineage resolved from semantic metadata fallback.']
        steps = [UpstreamTraceStep(kind='source_table', source_table_name=source_table_name)]
        if source_field_name is not None:
            steps.append(UpstreamTraceStep(
                kind='source_field',
                source_table_name=source_table_name,
                source_field_name=source_field_name
            ))
        return [UpstreamTraceRoute(
            id_suffix='semantic-fallback',
            title='Semantic source fallback',
            steps=steps,
            diagnostics=diagnostics
        )]

    def resolve_pipeline_factor_dependencies(
            self, pipelines: List[Pipeline], topic: Optional[Topic], factor: Optional[Factor]
    ) -> Tuple[List[Pipeline], List[str]]:
        if topic is None:
            return [], []
        if factor is None:
            return pipelines, []

        scored: List[Tuple[int, Pipeline]] = []
        for pipeline in pipelines:
            score = self._pipeline_factor_match_score(pipeline, topic.topicId, factor.factorId)
            if score > 0:
                scored.append((score, pipeline))

        if len(scored) != 0:
            scored.sort(key=lambda item: (-item[0], not bool(item[1].enabled), not bool(item[1].validated),
                                          item[1].name or '', item[1].pipelineId or ''))
            return [pipeline for _, pipeline in scored], []
        if len(pipelines) == 0:
            return [], []
        return pipelines, [f'Pipeline exists for topic[{topic.name}] but no factor-level mapping was resolved for[{factor.name}].']

    def resolve_source(self, semantic_model: Optional[SemanticModel], measure: Optional[Measure]) -> Tuple[Optional[str], Optional[str]]:
        table_name = None
        source_field = None
        node_relation = self._read_attr(semantic_model, 'node_relation')
        if semantic_model is not None and node_relation is not None:
            table_name = self._read_attr(node_relation, 'relation_name') or self._read_attr(node_relation, 'alias')
        if measure is not None:
            expr = self._read_attr(measure, 'expr')
            candidates = self.extract_field_candidates(expr)
            if len(candidates) != 0:
                source_field = candidates[0]
            elif expr is not None and len(str(expr).strip()) != 0:
                source_field = str(expr).strip()
        return table_name, source_field

    @staticmethod
    def normalize_metric_type(metric: MetricWithCategory) -> str:
        metric_type = MetricLineageResolver._read_attr(metric, 'type')
        return metric_type.value if hasattr(metric_type, 'value') else str(metric_type)

    @staticmethod
    def _measure_name_from_reference(reference: Optional[MeasureReference]) -> Optional[str]:
        if reference is None:
            return None
        return MetricLineageResolver._read_attr(reference, 'name')

    def _resolve_metric_ref_measure_name(
            self, metric_ref: MetricRef, tenant_id: str, visited_metrics: Set[str]
    ) -> Optional[str]:
        if metric_ref is None or metric_ref.name is None or metric_ref.name in visited_metrics:
            return None
        referenced = self.resolve_metric(metric_ref.name, tenant_id)
        if referenced is None:
            return None
        visited = set(visited_metrics)
        visited.add(metric_ref.name)
        metric_type = self.normalize_metric_type(referenced)
        type_params = self._type_params_of(referenced)
        if metric_type == MetricType.SIMPLE.value:
            return self._measure_name_from_reference(self._read_attr(type_params, 'measure'))
        if metric_type == MetricType.RATIO.value:
            return self._measure_name_from_reference(self._read_attr(type_params, 'numerator')) \
                or self._measure_name_from_reference(self._read_attr(type_params, 'denominator'))
        if metric_type == MetricType.DERIVED.value:
            for ref in self._read_attr(type_params, 'metrics') or []:
                measure_name = self._resolve_metric_ref_measure_name(ref, tenant_id, visited)
                if measure_name is not None:
                    return measure_name
        return self._measure_name_from_reference(self._read_attr(type_params, 'measure'))

    def _build_branches_for_metric(
            self, metric: MetricWithCategory, tenant_id: str, visited_metrics: Set[str], prefix: str, title_prefix: str
    ) -> List[MetricLineageBranch]:
        metric_type = self.normalize_metric_type(metric)
        type_params = self._type_params_of(metric)
        branches: List[MetricLineageBranch] = []
        if metric_type == MetricType.SIMPLE.value:
            measure_name = self._measure_name_from_reference(self._read_attr(type_params, 'measure'))
            branches.extend(self._build_branches_for_reference(
                reference_name=measure_name,
                tenant_id=tenant_id,
                visited_metrics=visited_metrics,
                prefix=prefix,
                title_prefix=title_prefix,
                default_title=f'{title_prefix}Primary lineage' if len(title_prefix) != 0 else 'Primary lineage',
                default_branch_type='primary',
                is_primary_candidate=prefix == 'primary'
            ))
        elif metric_type == MetricType.RATIO.value:
            numerator = self._measure_name_from_reference(self._read_attr(type_params, 'numerator'))
            denominator = self._measure_name_from_reference(self._read_attr(type_params, 'denominator'))
            branches.extend(self._build_branches_for_reference(
                reference_name=numerator,
                tenant_id=tenant_id,
                visited_metrics=visited_metrics,
                prefix=f'{prefix}-numerator',
                title_prefix=title_prefix,
                default_title=f'{title_prefix}Numerator lineage' if len(title_prefix) != 0 else 'Numerator lineage',
                default_branch_type='numerator',
                is_primary_candidate=prefix == 'primary'
            ))
            branches.extend(self._build_branches_for_reference(
                reference_name=denominator,
                tenant_id=tenant_id,
                visited_metrics=visited_metrics,
                prefix=f'{prefix}-denominator',
                title_prefix=title_prefix,
                default_title=f'{title_prefix}Denominator lineage' if len(title_prefix) != 0 else 'Denominator lineage',
                default_branch_type='denominator',
                is_primary_candidate=False
            ))
        elif metric_type == MetricType.DERIVED.value:
            for index, metric_ref in enumerate(self._read_attr(type_params, 'metrics') or []):
                ref_name = self._read_attr(metric_ref, 'name')
                branch_prefix = f'{prefix}-ref-{index + 1}'
                branches.extend(self._build_branches_for_reference(
                    reference_name=ref_name,
                    tenant_id=tenant_id,
                    visited_metrics=visited_metrics,
                    prefix=branch_prefix,
                    title_prefix=title_prefix,
                    default_title=f'{title_prefix}Reference lineage {index + 1}',
                    default_branch_type='metric_ref',
                    is_primary_candidate=index == 0 and prefix == 'primary',
                    explicit_metric_ref=True
                ))
        else:
            measure_name = self._measure_name_from_reference(self._read_attr(type_params, 'measure'))
            input_measures = self._read_attr(type_params, 'input_measures') or []
            if measure_name is None and len(input_measures) != 0:
                measure_name = self._measure_name_from_reference(input_measures[0])
            branches.extend(self._build_branches_for_reference(
                reference_name=measure_name,
                tenant_id=tenant_id,
                visited_metrics=visited_metrics,
                prefix=prefix,
                title_prefix=title_prefix,
                default_title=f'{title_prefix}Primary lineage' if len(title_prefix) != 0 else 'Primary lineage',
                default_branch_type=metric_type,
                is_primary_candidate=prefix == 'primary'
            ))
        return branches

    def _build_branches_for_reference(
            self, reference_name: Optional[str], tenant_id: str, visited_metrics: Set[str], prefix: str, title_prefix: str,
            default_title: str, default_branch_type: str, is_primary_candidate: bool, explicit_metric_ref: bool = False
    ) -> List[MetricLineageBranch]:
        if reference_name is None:
            return []
        if reference_name in visited_metrics:
            return [MetricLineageBranch(
                id=prefix,
                title=default_title,
                branchType=default_branch_type,
                metricRefName=reference_name,
                metricRefChain=[reference_name],
                isPrimaryCandidate=is_primary_candidate
            )]

        referenced = self.resolve_metric(reference_name, tenant_id)
        if referenced is None:
            if explicit_metric_ref:
                return [MetricLineageBranch(
                    id=prefix,
                    title=default_title,
                    branchType=default_branch_type,
                    metricRefName=reference_name,
                    metricRefChain=[reference_name],
                    isPrimaryCandidate=is_primary_candidate
                )]
            return [MetricLineageBranch(
                id=prefix,
                title=default_title,
                branchType=default_branch_type,
                measureName=reference_name,
                isPrimaryCandidate=is_primary_candidate
            )]

        nested_visited = set(visited_metrics)
        nested_visited.add(reference_name)
        nested_title_prefix = f'{title_prefix}{reference_name} / '
        nested = self._build_branches_for_metric(referenced, tenant_id, nested_visited, prefix, nested_title_prefix)
        if len(nested) == 0:
            return [MetricLineageBranch(
                id=prefix,
                title=default_title,
                branchType=default_branch_type,
                metricRefName=reference_name,
                metricRefChain=[reference_name],
                isPrimaryCandidate=is_primary_candidate
            )]

        for nested_branch in nested:
            nested_branch.metricRefName = reference_name
            nested_branch.metricRefChain = [reference_name, *nested_branch.metricRefChain]
            nested_branch.isPrimaryCandidate = nested_branch.isPrimaryCandidate or is_primary_candidate
        return nested

    def _load_semantic_models(self, tenant_id: str) -> List[SemanticModel]:
        if self._semantic_models_cache is None:
            def load() -> List[SemanticModel]:
                return self._semantic_service.find_all(tenant_id)

            self._semantic_models_cache = trans_readonly(self._semantic_service, load)
        return self._semantic_models_cache

    def _pipeline_mentions_factor(self, pipeline: Pipeline, topic_id: Optional[str], factor_id: Optional[str]) -> bool:
        if topic_id is None or factor_id is None:
            return False
        for action in self._iter_actions(pipeline):
            if self._action_mentions_factor(action, topic_id, factor_id):
                return True
        return False

    def _pipeline_factor_match_score(self, pipeline: Pipeline, topic_id: Optional[str], factor_id: Optional[str]) -> int:
        if topic_id is None or factor_id is None:
            return 0
        score = 0
        for action in self._iter_actions(pipeline):
            score += self._action_factor_match_score(action, topic_id, factor_id)
        return score

    @staticmethod
    def _iter_actions(pipeline: Pipeline) -> Iterable[PipelineAction]:
        for stage in pipeline.stages or []:
            stage: PipelineStage
            for unit in stage.units or []:
                unit: PipelineUnit
                for action in unit.do or []:
                    yield action

    def _action_mentions_factor(self, action: PipelineAction, topic_id: str, factor_id: str) -> bool:
        return self._action_factor_match_score(action, topic_id, factor_id) > 0

    def _action_factor_match_score(self, action: PipelineAction, topic_id: str, factor_id: str) -> int:
        action_topic_id = getattr(action, 'topicId', None)
        action_factor_id = getattr(action, 'factorId', None)
        if action_topic_id == topic_id and action_factor_id == factor_id:
            return 3
        if isinstance(action, (ReadRowAction, ReadRowsAction, ReadFactorAction, ReadFactorsAction)):
            score = 0
            if self._parameter_joint_mentions_factor(getattr(action, 'by', None), topic_id, factor_id):
                score += 1
            if action_topic_id == topic_id:
                score += 1
            return score
        if isinstance(action, CopyToMemoryAction):
            return 1 if self._parameter_mentions_factor(getattr(action, 'source', None), topic_id, factor_id) else 0
        if isinstance(action, WriteFactorAction):
            score = 0
            if self._parameter_mentions_factor(action.source, topic_id, factor_id):
                score += 2
            if self._parameter_joint_mentions_factor(getattr(action, 'by', None), topic_id, factor_id):
                score += 1
            return score
        if isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
            score = 0
            for mapping in getattr(action, 'mapping', []) or []:
                if self._mapping_mentions_factor(mapping, topic_id, factor_id):
                    score += 2
            if self._parameter_joint_mentions_factor(getattr(action, 'by', None), topic_id, factor_id):
                score += 1
            return score
        return 0

    def _mapping_mentions_factor(self, mapping: MappingFactor, topic_id: str, factor_id: str) -> bool:
        if mapping.factorId == factor_id:
            return True
        return self._parameter_mentions_factor(mapping.source, topic_id, factor_id)

    def _parameter_joint_mentions_factor(
            self, joint: Optional[ParameterCondition], topic_id: str, factor_id: str
    ) -> bool:
        if joint is None:
            return False
        if isinstance(joint, ParameterExpression):
            return self._parameter_mentions_factor(joint.left, topic_id, factor_id) or \
                self._parameter_mentions_factor(joint.right, topic_id, factor_id)
        if isinstance(joint, ParameterJoint):
            for condition in joint.filters or []:
                if self._parameter_joint_mentions_factor(condition, topic_id, factor_id):
                    return True
        return False

    def _parameter_mentions_factor(self, parameter: Optional[Parameter], topic_id: str, factor_id: str) -> bool:
        if parameter is None:
            return False
        if self._parameter_joint_mentions_factor(parameter.on, topic_id, factor_id):
            return True
        if isinstance(parameter, TopicFactorParameter):
            return parameter.topicId == topic_id and parameter.factorId == factor_id
        if isinstance(parameter, ComputedParameter):
            for nested in parameter.parameters or []:
                if self._parameter_mentions_factor(nested, topic_id, factor_id):
                    return True
        return False

    def _trace_upstream_from_topic(
            self, topic: Topic, factor: Optional[Factor], tenant_id: str, visited_topic_keys: Set[str],
            visited_pipeline_ids: Set[str]
    ) -> List[UpstreamTraceRoute]:
        topic_key = f'{topic.topicId or topic.name}:{factor.factorId if factor is not None else "*"}'
        if topic_key in visited_topic_keys:
            return []
        next_visited_topic_keys = set(visited_topic_keys)
        next_visited_topic_keys.add(topic_key)

        if self._is_raw_topic(topic):
            return [UpstreamTraceRoute(
                id_suffix=f'raw-{topic.topicId or topic.name}',
                title=f'Raw topic[{topic.name}]',
                steps=[],
                diagnostics=[]
            )]

        writing_pipelines = self._find_pipelines_writing_topic_factor(topic, factor, tenant_id)
        if len(writing_pipelines) == 0:
            return []

        routes: List[UpstreamTraceRoute] = []
        for pipeline in writing_pipelines:
            pipeline_id = pipeline.pipelineId or pipeline.name
            if pipeline_id is None or pipeline_id in visited_pipeline_ids:
                continue

            next_visited_pipeline_ids = set(visited_pipeline_ids)
            next_visited_pipeline_ids.add(pipeline_id)
            dependencies, diagnostics = self._extract_upstream_dependencies_from_pipeline(pipeline, topic, factor)

            if len(dependencies) == 0 and pipeline.topicId is not None:
                dependencies = [UpstreamDependency(topic_id=pipeline.topicId)]
                diagnostics = diagnostics + [
                    f'Pipeline[{pipeline.name or pipeline.pipelineId}] used trigger topic fallback for upstream trace.'
                ]

            if len(dependencies) == 0:
                routes.append(UpstreamTraceRoute(
                    id_suffix=self._sanitize_route_suffix(pipeline.name or pipeline.pipelineId or topic.name),
                    title=f'Pipeline[{pipeline.name or pipeline.pipelineId}]',
                    steps=[UpstreamTraceStep(kind='pipeline', pipeline=pipeline)],
                    diagnostics=diagnostics
                ))
                continue

            for index, dependency in enumerate(dependencies):
                upstream_topic = self.resolve_topic_by_id(dependency.topic_id)
                upstream_factor = self.resolve_topic_factor_by_id(upstream_topic, dependency.factor_id)
                step_prefix = [UpstreamTraceStep(kind='pipeline', pipeline=pipeline)]
                if upstream_topic is not None:
                    step_prefix.append(UpstreamTraceStep(kind='topic', topic=upstream_topic))
                    if upstream_factor is not None:
                        step_prefix.append(UpstreamTraceStep(kind='topic_factor', topic=upstream_topic, factor=upstream_factor))

                child_routes = []
                if upstream_topic is not None:
                    child_routes = self._trace_upstream_from_topic(
                        topic=upstream_topic,
                        factor=upstream_factor,
                        tenant_id=tenant_id,
                        visited_topic_keys=next_visited_topic_keys,
                        visited_pipeline_ids=next_visited_pipeline_ids
                    )

                suffix = self._sanitize_route_suffix(
                    f'{pipeline.name or pipeline.pipelineId or "pipeline"}-{upstream_topic.name if upstream_topic is not None else index}'
                )
                if len(child_routes) == 0:
                    routes.append(UpstreamTraceRoute(
                        id_suffix=suffix,
                        title=f'Pipeline[{pipeline.name or pipeline.pipelineId}]',
                        steps=step_prefix,
                        diagnostics=diagnostics + (
                            [f'Upstream topic[{dependency.topic_id}] could not be further resolved.']
                            if upstream_topic is None else []
                        )
                    ))
                    continue

                for child_route in child_routes:
                    routes.append(UpstreamTraceRoute(
                        id_suffix=f'{suffix}-{child_route.id_suffix}',
                        title=f'Pipeline[{pipeline.name or pipeline.pipelineId}] -> {child_route.title}',
                        steps=step_prefix + child_route.steps,
                        diagnostics=diagnostics + child_route.diagnostics
                    ))

        return routes

    def _find_pipelines_writing_topic_factor(
            self, topic: Topic, factor: Optional[Factor], tenant_id: str
    ) -> List[Pipeline]:
        matches: List[Tuple[int, Pipeline]] = []
        target_factor_id = factor.factorId if factor is not None else None
        for pipeline in self._load_all_pipelines(tenant_id):
            score = self._pipeline_writes_target_score(pipeline, topic.topicId, target_factor_id)
            if score > 0:
                matches.append((score, pipeline))
        matches.sort(key=lambda item: (
            -item[0], not bool(item[1].enabled), not bool(item[1].validated), item[1].name or '', item[1].pipelineId or ''
        ))
        return [pipeline for _, pipeline in matches]

    def _pipeline_writes_target_score(self, pipeline: Pipeline, topic_id: Optional[str], factor_id: Optional[str]) -> int:
        if topic_id is None:
            return 0
        score = 0
        for action in self._iter_actions(pipeline):
            score = max(score, self._write_action_target_score(action, topic_id, factor_id))
        return score

    def _write_action_target_score(self, action: PipelineAction, topic_id: str, factor_id: Optional[str]) -> int:
        action_topic_id = getattr(action, 'topicId', None)
        if action_topic_id != topic_id:
            return 0
        if isinstance(action, WriteFactorAction):
            if factor_id is None:
                return 2
            return 4 if getattr(action, 'factorId', None) == factor_id else 0
        if isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
            if factor_id is None:
                return 2
            for mapping in getattr(action, 'mapping', []) or []:
                if getattr(mapping, 'factorId', None) == factor_id:
                    return 3
            return 1
        return 0

    def _extract_upstream_dependencies_from_pipeline(
            self, pipeline: Pipeline, target_topic: Topic, target_factor: Optional[Factor]
    ) -> Tuple[List[UpstreamDependency], List[str]]:
        dependencies: List[UpstreamDependency] = []
        diagnostics: List[str] = []
        target_factor_id = target_factor.factorId if target_factor is not None else None

        for action in self._iter_actions(pipeline):
            if isinstance(action, WriteFactorAction):
                if self._write_action_target_score(action, target_topic.topicId, target_factor_id) == 0:
                    continue
                dependencies.extend(self._extract_dependencies_from_parameter(action.source))
                dependencies.extend(self._extract_dependencies_from_joint(getattr(action, 'by', None)))
            elif isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
                if getattr(action, 'topicId', None) != target_topic.topicId:
                    continue
                matched = False
                for mapping in getattr(action, 'mapping', []) or []:
                    mapping_factor_id = getattr(mapping, 'factorId', None)
                    if target_factor_id is not None and mapping_factor_id != target_factor_id:
                        continue
                    matched = True
                    dependencies.extend(self._extract_dependencies_from_parameter(mapping.source))
                if matched or target_factor_id is None:
                    dependencies.extend(self._extract_dependencies_from_joint(getattr(action, 'by', None)))

        deduped = self._deduplicate_dependencies(dependencies)
        if len(deduped) == 0:
            diagnostics.append(
                f'Pipeline[{pipeline.name or pipeline.pipelineId}] writes topic[{target_topic.name}] but upstream factor mapping was not resolved.'
            )
        return deduped, diagnostics

    def _extract_dependencies_from_joint(self, joint: Optional[ParameterCondition]) -> List[UpstreamDependency]:
        if joint is None:
            return []
        if isinstance(joint, ParameterExpression):
            return self._extract_dependencies_from_parameter(joint.left) + self._extract_dependencies_from_parameter(joint.right)
        if isinstance(joint, ParameterJoint):
            dependencies: List[UpstreamDependency] = []
            for condition in joint.filters or []:
                dependencies.extend(self._extract_dependencies_from_joint(condition))
            return dependencies
        return []

    def _extract_dependencies_from_parameter(self, parameter: Optional[Parameter]) -> List[UpstreamDependency]:
        if parameter is None:
            return []
        dependencies = self._extract_dependencies_from_joint(parameter.on)
        if isinstance(parameter, TopicFactorParameter):
            dependencies.append(UpstreamDependency(topic_id=parameter.topicId, factor_id=parameter.factorId))
        elif isinstance(parameter, ComputedParameter):
            for nested in parameter.parameters or []:
                dependencies.extend(self._extract_dependencies_from_parameter(nested))
        return dependencies

    @staticmethod
    def _deduplicate_dependencies(dependencies: List[UpstreamDependency]) -> List[UpstreamDependency]:
        deduped: List[UpstreamDependency] = []
        seen: Set[Tuple[Optional[str], Optional[str]]] = set()
        for dependency in dependencies:
            key = dependency.topic_id, dependency.factor_id
            if key in seen or dependency.topic_id is None:
                continue
            seen.add(key)
            deduped.append(dependency)
        return deduped

    def _load_all_pipelines(self, tenant_id: str) -> List[Pipeline]:
        if self._all_pipelines_cache is None:
            def load() -> List[Pipeline]:
                return self._pipeline_service.find_all(tenant_id)

            pipelines = trans_readonly(self._pipeline_service, load)
            self._all_pipelines_cache = sorted(
                pipelines,
                key=lambda pipeline: (
                    not bool(pipeline.enabled), not bool(pipeline.validated), pipeline.name or '', pipeline.pipelineId or ''
                )
            )
        return self._all_pipelines_cache

    @staticmethod
    def _sanitize_route_suffix(value: str) -> str:
        return re.sub(r'[^A-Za-z0-9_-]+', '-', value).strip('-').lower() or 'route'

    @staticmethod
    def _is_raw_topic(topic: Optional[Topic]) -> bool:
        if topic is None:
            return False
        topic_type = MetricLineageResolver._read_attr(topic, 'type')
        topic_type = getattr(topic_type, 'value', topic_type)
        return topic_type == 'raw'

    @classmethod
    def extract_field_candidates(cls, expression: Optional[str]) -> List[str]:
        if expression is None:
            return []
        expr = expression.strip()
        if len(expr) == 0:
            return []
        if cls.SIMPLE_FIELD_PATTERN.fullmatch(expr):
            return [expr]
        last_name = cls.LAST_NAME_PATTERN.search(expr)
        if last_name is None:
            return []
        return [last_name.group(1)]

    @staticmethod
    def _read_attr(instance, name: str):
        if instance is None:
            return None
        if isinstance(instance, dict):
            return instance.get(name)
        return getattr(instance, name, None)

    def _type_params_of(self, metric: MetricWithCategory):
        return self._read_attr(metric, 'type_params') or {}

    def _find_measure_by_name(self, semantic_model: SemanticModel, measure_name: str):
        measures = self._read_attr(semantic_model, 'measures') or []
        for measure in measures:
            if self._read_attr(measure, 'name') == measure_name:
                return measure
        return None
