from typing import Dict, List, Optional, Set

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService as KernelTopicService
from watchmen_metricflow.model.metrics import Metric, MetricTypeParams
from watchmen_metricflow.model.semantic import SemanticModel, SemanticModelSourceType
from watchmen_metricflow.service.meta_service import load_metrics_by_tenant_id_sync, \
	load_semantic_models_by_tenant_id_sync
from watchmen_model.admin import Topic
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

MetricName = str


def collect_measure_names(metric: Metric) -> Set[str]:
	"""Measure references a metric relies on, used to locate its semantic model."""
	params: Optional[MetricTypeParams] = metric.type_params
	if params is None:
		return set()
	names: Set[str] = set()
	for reference in [params.measure, params.numerator, params.denominator]:
		if reference is not None and is_not_blank(reference.name):
			names.add(reference.name)
	for reference in params.input_measures or []:
		if reference is not None and is_not_blank(reference.name):
			names.add(reference.name)
	return names


def resolve_metric_source_topics(
		principal_service: PrincipalService
) -> Dict[MetricName, List[Topic]]:
	"""metric name -> source topics of its TOPIC-bound semantic models (db_direct excluded)."""
	if is_blank(principal_service.get_tenant_id()):
		return {}
	metrics = load_metrics_by_tenant_id_sync(principal_service)
	models = load_semantic_models_by_tenant_id_sync(principal_service)
	topic_service = KernelTopicService(principal_service)
	topic_cache: Dict[str, Optional[Topic]] = {}

	def find_topic(topic_id: str) -> Optional[Topic]:
		if topic_id not in topic_cache:
			topic_cache[topic_id] = topic_service.find_by_id(topic_id)
		return topic_cache[topic_id]

	result: Dict[MetricName, List[Topic]] = {}
	for metric in metrics:
		measure_names = collect_measure_names(metric)
		if not measure_names:
			continue
		source_topics: List[Topic] = []
		for model in models:
			if is_blank(model.topicId):
				continue
			if model.sourceType not in (None, SemanticModelSourceType.TOPIC):
				continue
			if not any(x.name in measure_names for x in model.measures or []):
				continue
			topic = find_topic(model.topicId)  # type: Optional[Topic]
			if topic is not None:
				source_topics.append(topic)
		result[metric.name] = source_topics
	return result


def resolve_metric_source_data_source_id(
		materialization_metric_name: str, principal_service: PrincipalService
) -> Optional[str]:
	"""Data source of the metric's semantic model topic, so the wide table lives next to it."""
	sources = resolve_metric_source_topics(principal_service).get(materialization_metric_name) or []
	for topic in sources:
		if is_not_blank(topic.dataSourceId):
			return topic.dataSourceId
	return None
