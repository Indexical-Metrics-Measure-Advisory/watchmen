from typing import Any, Dict, List, Optional, Set

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.common import ParameterKind, TenantId
from watchmen_storage import TransactionalStorageSPI
from watchmen_utilities import ExtendedBaseModel, is_blank, is_not_blank

from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.data_product import DataProduct, TopicSize

# auto score = weighted blend of three usage signals, each normalized to 0-100
# (min-max across all products of the tenant): metric references 40%, consuming
# pipelines 30%, row volume 30%. composite score blends auto and manual scores:
# composite = COMPOSITE_AUTO_WEIGHT * auto + (1 - COMPOSITE_AUTO_WEIGHT) * manual
AUTO_WEIGHT_METRIC = 40
AUTO_WEIGHT_PIPELINE = 30
AUTO_WEIGHT_ROWS = 30
COMPOSITE_AUTO_WEIGHT = 0.7


class AutoScoreBreakdown(ExtendedBaseModel):
    product_id: Optional[str] = None
    metric_refs: int = 0
    pipeline_refs: int = 0
    rows: int = 0
    auto_score: int = 0


def _normalize_values(values: List[int]) -> List[float]:
    if len(values) == 0:
        return []
    minimum, maximum = min(values), max(values)
    if maximum <= minimum:
        # all products carry the same signal, it contributes nothing
        return [0.0 for _ in values]
    spread = maximum - minimum
    return [(value - minimum) / spread for value in values]


def _read(obj: Any, name: str, default: Any = None) -> Any:
    """
    Read a field from either a pydantic model or a raw dict. watchmen's
    ExtendedBaseModel stores nested values straight into __dict__ without
    pydantic coercion, so nested models/lists arrive as plain dicts.
    """
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _collect_measure_names(metric) -> Set[str]:
    names: Set[str] = set()
    params = _read(metric, 'type_params')
    if params is None:
        return names
    for key in ('measure', 'numerator', 'denominator'):
        ref = _read(params, key)
        if ref is not None and is_not_blank(_read(ref, 'name')):
            names.add(_read(ref, 'name'))
    for ref in (_read(params, 'input_measures') or []):
        if is_not_blank(_read(ref, 'name')):
            names.add(_read(ref, 'name'))
    return names


def _count_metric_refs_by_topic(metrics: List, semantic_models: List) -> Dict[str, int]:
    """
    Count metrics referencing each topic: metric -> referenced measures -> semantic
    models bound to the topic (SemanticModel.topicId). Derived metrics are followed
    recursively through type_params.metrics, cycle-safe.
    """
    measure_topics: Dict[str, Set[str]] = {}
    for model in semantic_models:
        topic_id = _read(model, 'topicId')
        if is_blank(topic_id):
            continue
        for measure in (_read(model, 'measures') or []):
            measure_name = _read(measure, 'name')
            if is_not_blank(measure_name):
                measure_topics.setdefault(measure_name, set()).add(topic_id)

    metric_by_name = {}
    for metric in metrics:
        name = _read(metric, 'name')
        if is_not_blank(name):
            metric_by_name[name] = metric
    metric_names_by_topic: Dict[str, Set[str]] = {}

    def collect_topics_of_metric(metric_name: str, visiting: Set[str]) -> Set[str]:
        topics: Set[str] = set()
        if metric_name in visiting:
            return topics
        visiting.add(metric_name)
        metric = metric_by_name.get(metric_name)
        if metric is None:
            return topics
        for measure_name in _collect_measure_names(metric):
            topics |= measure_topics.get(measure_name, set())
        nested = _read(_read(metric, 'type_params'), 'metrics') or []
        for ref in nested:
            if is_not_blank(_read(ref, 'name')):
                topics |= collect_topics_of_metric(_read(ref, 'name'), visiting)
        return topics

    for metric in metrics:
        name = _read(metric, 'name')
        if is_blank(name):
            continue
        for topic_id in collect_topics_of_metric(name, set()):
            metric_names_by_topic.setdefault(topic_id, set()).add(name)
    return {topic_id: len(names) for topic_id, names in metric_names_by_topic.items()}


def _iter_parameter_topic_ids(parameter) -> Set[str]:
    topic_ids: Set[str] = set()

    def walk(node):
        if node is None:
            return
        kind = _read(node, 'kind')
        if kind == ParameterKind.TOPIC and is_not_blank(_read(node, 'topicId')):
            topic_ids.add(_read(node, 'topicId'))
        elif kind == ParameterKind.COMPUTED:
            for nested in (_read(node, 'parameters') or []):
                walk(nested)

    walk(parameter)
    return topic_ids


def _pipeline_read_topic_ids(pipeline) -> Set[str]:
    """
    Topics a pipeline consumes: trigger topic, explicit read actions and every
    topic referenced by write/mapping source parameters. Actions may arrive as
    raw dicts (ExtendedBaseModel skips nested coercion), so they are told apart
    by shape instead of isinstance: 'mapping' -> row write, 'factorId' -> factor
    write (its source), otherwise a plain topic read.
    """
    topic_ids: Set[str] = set()
    trigger = _read(pipeline, 'topicId')
    if is_not_blank(trigger):
        topic_ids.add(trigger)
    for stage in (_read(pipeline, 'stages') or []):
        for unit in (_read(stage, 'units') or []):
            for action in (_read(unit, 'do') or []):
                mapping = _read(action, 'mapping')
                if mapping:
                    for entry in mapping:
                        topic_ids |= _iter_parameter_topic_ids(_read(entry, 'source'))
                elif is_not_blank(_read(action, 'factorId')):
                    topic_ids |= _iter_parameter_topic_ids(_read(action, 'source'))
                elif is_not_blank(_read(action, 'topicId')):
                    topic_ids.add(_read(action, 'topicId'))
    return topic_ids


def _count_pipeline_refs_by_topic(pipelines) -> Dict[str, int]:
    """
    Count enabled pipelines consuming each topic: the trigger topic plus every
    topic referenced by read/write mapping parameters.
    """
    counts: Dict[str, int] = {}
    for pipeline in pipelines:
        if _read(pipeline, 'enabled') is False:
            continue
        consumed = _pipeline_read_topic_ids(pipeline)
        for topic_id in consumed:
            counts[topic_id] = counts.get(topic_id, 0) + 1
    return counts


def compute_auto_scores(
        storage: TransactionalStorageSPI, products: List[DataProduct], topic_sizes: List[TopicSize],
        principal_service: PrincipalService, tenant_id: Optional[TenantId] = None
) -> Dict[str, AutoScoreBreakdown]:
    """
    Auto value score of each product: 40% metric references + 30% consuming
    pipelines + 30% row volume, each min-max normalized across products.
    The given storage must be the shared instance with its transaction already
    opened by the caller (build_asset_map's trans_readonly) - every service here
    joins that transaction instead of opening its own.
    """
    if tenant_id is None:
        tenant_id = principal_service.get_tenant_id()
    metric_service = MetricService(storage, ask_snowflake_generator(), principal_service)
    semantic_service = SemanticModelService(storage, ask_snowflake_generator(), principal_service)
    pipeline_service = PipelineService(storage, ask_snowflake_generator(), principal_service)

    metrics = metric_service.find_all(tenant_id)
    semantic_models = semantic_service.find_all(tenant_id)
    pipelines = pipeline_service.find_all(tenant_id)

    metric_refs_by_topic = _count_metric_refs_by_topic(metrics, semantic_models)
    pipeline_refs_by_topic = _count_pipeline_refs_by_topic(pipelines)
    rows_by_topic: Dict[str, int] = {size.topic_id: size.rows for size in topic_sizes}

    breakdowns: Dict[str, AutoScoreBreakdown] = {}
    for product in products:
        topic_ids = product.topic_ids or []
        breakdowns[product.id] = AutoScoreBreakdown(
            product_id=product.id,
            metric_refs=sum(metric_refs_by_topic.get(topic_id, 0) for topic_id in topic_ids),
            pipeline_refs=sum(pipeline_refs_by_topic.get(topic_id, 0) for topic_id in topic_ids),
            rows=sum(rows_by_topic.get(topic_id, 0) for topic_id in topic_ids),
        )

    breakdown_list = list(breakdowns.values())
    metric_norms = _normalize_values([breakdown.metric_refs for breakdown in breakdown_list])
    pipeline_norms = _normalize_values([breakdown.pipeline_refs for breakdown in breakdown_list])
    row_norms = _normalize_values([breakdown.rows for breakdown in breakdown_list])
    total_weight = AUTO_WEIGHT_METRIC + AUTO_WEIGHT_PIPELINE + AUTO_WEIGHT_ROWS
    for breakdown, metric_norm, pipeline_norm, row_norm in \
            zip(breakdown_list, metric_norms, pipeline_norms, row_norms):
        breakdown.auto_score = round(
            (AUTO_WEIGHT_METRIC * metric_norm
             + AUTO_WEIGHT_PIPELINE * pipeline_norm
             + AUTO_WEIGHT_ROWS * row_norm) / total_weight * 100)

    return breakdowns


__all__ = [
    'AutoScoreBreakdown', 'COMPOSITE_AUTO_WEIGHT', 'compute_auto_scores',
]
