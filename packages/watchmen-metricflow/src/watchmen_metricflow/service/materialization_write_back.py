import re
from datetime import date, datetime
from logging import getLogger
from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService as KernelTopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.service.topic_structure_helper import create_topic_structure
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.admin import TopicService as MetaTopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.model.materialization import FactorMappingColumn, FactorRole, Materialization, \
	WriteMode
from watchmen_metricflow.model.semantic import SemanticModelSourceType
from watchmen_metricflow.service.meta_service import load_metrics_by_tenant_id_sync, \
	load_semantic_models_by_tenant_id_sync
from watchmen_metricflow.util import trans
from watchmen_model.admin import Factor, FactorType, Topic, TopicKind, TopicType
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .materialization_error import MaterializationError
from .materialization_factor_mapping import get_effective_factor_mapping, to_column_name

logger = getLogger(__name__)

AUTO_TOPIC_NAME_PREFIX = 'mat_'
AUTO_TOPIC_NAME_MAX_LENGTH = 40


def resolve_target_schema(
		materialization: Materialization, principal_service: PrincipalService
) -> TopicSchema:
	"""Existing target topic, or the auto-created wide topic when autoCreateTopic is on."""
	if is_not_blank(materialization.targetTopicId):
		schema = KernelTopicService(principal_service).find_schema_by_id(
			materialization.targetTopicId, principal_service.get_tenant_id())
		if schema is None:
			raise MaterializationError(
				f'Target topic [{materialization.targetTopicId}] not found.')
		return schema
	if not materialization.autoCreateTopic:
		raise MaterializationError('Target topic is required.')
	return ensure_auto_topic(materialization, principal_service)


def auto_topic_name(materialization: Materialization) -> str:
	name = f'{AUTO_TOPIC_NAME_PREFIX}{materialization.metricName or materialization.metricId or "metric"}'
	name = re.sub(r'[^a-z0-9_]+', '_', name.strip().lower()).strip('_')
	return name[:AUTO_TOPIC_NAME_MAX_LENGTH]


def ensure_auto_topic(
		materialization: Materialization, principal_service: PrincipalService
) -> TopicSchema:
	topic_service = KernelTopicService(principal_service)
	tenant_id = principal_service.get_tenant_id()
	name = auto_topic_name(materialization)
	existing = topic_service.find_schema_by_name(name, tenant_id)
	if existing is not None:
		return existing

	data_source_id = resolve_data_source_id(materialization, principal_service)
	if is_blank(data_source_id):
		raise MaterializationError(
			'Cannot determine the data source of the auto-created topic, '
			'select an explicit target topic instead.')

	mapping = get_effective_factor_mapping(materialization)
	snowflake_generator = ask_snowflake_generator()
	topic = Topic(
		topicId=str(snowflake_generator.next_id()),
		name=name,
		type=TopicType.AGGREGATE,
		kind=TopicKind.BUSINESS,
		dataSourceId=data_source_id,
		factors=[
			Factor(
				factorId=str(snowflake_generator.next_id()),
				type=_factor_type_of(column),
				name=column.columnName,
				label=column.columnName,
				indexGroup=_index_group_of(column, mapping)
			)
			for column in mapping
			if is_not_blank(column.columnName)
		],
		tenantId=tenant_id,
		userId=principal_service.userId
	)
	meta_topic_service = MetaTopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	trans(meta_topic_service, lambda: meta_topic_service.create(topic))
	# always attempt the physical table, auto-create promises a ready-to-write topic
	create_topic_structure(topic, principal_service)

	schema = topic_service.find_schema_by_name(name, tenant_id)
	if schema is None:
		raise MaterializationError(f'Auto-created topic [{name}] cannot be loaded back.')
	logger.info(f'Materialization [{materialization.materializationId}] auto-created topic [{name}].')
	return schema


def _factor_type_of(column: FactorMappingColumn) -> FactorType:
	if column.factorType == 'date':
		return FactorType.DATE
	if column.factorType == 'datetime':
		return FactorType.DATETIME
	if column.factorType == 'number':
		return FactorType.NUMBER
	if column.factorType == 'boolean':
		return FactorType.BOOLEAN
	return FactorType.TEXT


def _index_group_of(column: FactorMappingColumn, mapping: List[FactorMappingColumn]):
	from watchmen_model.admin import FactorIndexGroup
	# business key statDate + dimensions share one unique index
	if column.role in (FactorRole.TIME, FactorRole.DIMENSION):
		return FactorIndexGroup.UNIQUE_INDEX_1
	return None


def resolve_data_source_id(
		materialization: Materialization, principal_service: PrincipalService
) -> Optional[str]:
	"""Data source of the metric's semantic model topic, so the wide table lives next to it."""
	if is_blank(materialization.metricName):
		return None
	metrics = load_metrics_by_tenant_id_sync(principal_service)
	metric = ArrayHelper(metrics).find(lambda x: x.name == materialization.metricName)
	if metric is None or metric.type_params is None:
		return None

	measure_names = set()
	params = metric.type_params
	for reference in [params.measure, params.numerator, params.denominator]:
		if reference is not None and is_not_blank(reference.name):
			measure_names.add(reference.name)
	for reference in params.input_measures or []:
		if reference is not None and is_not_blank(reference.name):
			measure_names.add(reference.name)
	if not measure_names:
		return None

	models = load_semantic_models_by_tenant_id_sync(principal_service)
	sources = [
		model for model in models
		if model.sourceType == SemanticModelSourceType.TOPIC or is_not_blank(model.topicId)
	]
	for model in sources:
		if not is_not_blank(model.topicId):
			continue
		if ArrayHelper(model.measures).any(lambda x: x.name in measure_names):
			source_topic = KernelTopicService(principal_service).find_by_id(model.topicId)
			if source_topic is not None and is_not_blank(source_topic.dataSourceId):
				return source_topic.dataSourceId
	return None


def write_back(
		materialization: Materialization, schema: TopicSchema, rows: List[Dict[str, Any]],
		principal_service: PrincipalService
) -> int:
	"""TRUNCATE_INSERT replaces the whole table, MERGE upserts by business key."""
	if not rows:
		return 0
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)

	if materialization.writeMode == WriteMode.TRUNCATE_INSERT:
		service.truncate()
		for row in rows:
			service.trigger_by_insert(schema.prepare_data(dict(row), principal_service))
		return len(rows)

	key_columns = [
		to_column_name(name)
		for name in _business_key_factor_names(materialization)
	]
	written = 0
	for row in rows:
		prepared = schema.prepare_data(dict(row), principal_service)
		existing = service.find_one(_build_key_criteria(key_columns, prepared))
		if existing is not None and existing.get('id_') is not None:
			prepared['id_'] = existing['id_']
			service.trigger_by_merge(prepared)
		else:
			service.trigger_by_insert(prepared)
		written += 1
	return written


def _business_key_factor_names(materialization: Materialization) -> List[str]:
	return [
		column.columnName
		for column in get_effective_factor_mapping(materialization)
		if column.role in (FactorRole.TIME, FactorRole.DIMENSION) and is_not_blank(column.columnName)
	]


def _build_key_criteria(column_names: List[str], prepared: Dict[str, Any]) -> List[EntityCriteriaExpression]:
	criteria = []
	for column_name in column_names:
		factor_value = None
		for key, value in prepared.items():
			if to_column_name(key) == column_name:
				factor_value = value
				break
		if factor_value is None:
			continue
		criteria.append(EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=column_name), right=factor_value))
	if not criteria:
		raise MaterializationError('Business key columns are missing from the mapped rows.')
	return criteria
