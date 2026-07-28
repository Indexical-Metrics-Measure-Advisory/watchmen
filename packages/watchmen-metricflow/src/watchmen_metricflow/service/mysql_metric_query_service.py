"""MySQL bypass for metric queries.

dbt-metricflow has no MySQL support, so metrics whose data source is MySQL are
executed through the ontology SQL compiler (OntologySqlCompiler) plus a
SQLAlchemy engine (MySQLDataSourceHelper) instead of dbt.

Any metric is recursively decomposed into leaf measure aggregation queries
(one leaf = one measure aggregated by the request group-by, compiled to SQL);
ratio / derived / cumulative semantics are combined in Python, aligning rows
on group-by key tuples. Non-MySQL data sources are not handled here: the
public entry returns None and the caller falls through to the dbt path.
"""

import ast
import calendar
import re
from datetime import date, datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import Engine

from watchmen_auth import PrincipalService
from watchmen_model.admin import (
	DerivedAttribute, PhysicalTableMapping, VirtualObject, VirtualObjectAttribute, VirtualOntology)
from watchmen_model.system import DataSource, DataSourceParam, DataSourceType
from watchmen_rest.util import raise_400

from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.dimension_response import DimensionInfo, DimensionListResponse
from watchmen_metricflow.model.metrics import (
	MeasureReference, Metric, MetricRef, MetricType, MetricTypeParams, OffsetWindow)
from watchmen_metricflow.model.semantic import (
	AggregationType, Dimension, DimensionType, Entity, Measure, NodeRelation, SemanticModel,
	SemanticModelSourceType, TimeGranularity)
from watchmen_metricflow.ontology.engine_provider import OntologyRdsEngineProvider
from watchmen_metricflow.ontology.schema import OntologyGroupBy, OntologyQueryRequest
from watchmen_metricflow.ontology.sql_compiler import OntologySqlCompiler
from watchmen_metricflow.ontology.table_factory import OntologyTableFactory
from watchmen_metricflow.service.meta_service import (
	get_data_source_service, get_topic_service, load_metrics_by_tenant_id,
	load_semantic_models_by_tenant_id)
from watchmen_metricflow.util.trans import trans_readonly

_GRANULARITIES = ('day', 'week', 'month', 'quarter', 'year')

_AGGREGATE_MAP = {
	AggregationType.COUNT.value: 'count',
	AggregationType.COUNT_DISTINCT.value: 'count_distinct',
	AggregationType.SUM.value: 'sum',
	AggregationType.AVERAGE.value: 'avg',
	AggregationType.MIN.value: 'min',
	AggregationType.MAX.value: 'max',
}

_OPERATOR_MAP = {
	'=': 'eq', '!=': 'ne', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte', 'IN': 'in',
}

# {{ Dimension('name') }} / {{ Entity('name') }} / {{ TimeDimension('name', 'granularity') }}
_WHERE_CONDITION_PATTERN = re.compile(
	r'^\s*\{\{\s*(Dimension|Entity|TimeDimension)\s*\(\s*[\'"]([^\'"]+)[\'"]'
	r'(?:\s*,\s*[\'"][^\'"]*[\'"])*\s*\)\s*\}\}\s*(=|!=|>=|<=|>|<|IN)\s*(.+?)\s*$',
	re.IGNORECASE)


# =============================================================================
# Bypass detection
# =============================================================================

class MySQLModelSource:
	"""How one semantic model maps to a MySQL physical table."""

	def __init__(
			self, key: str, table_ref: str, data_source_id: Optional[str] = None,
			node_relation: Optional[NodeRelation] = None) -> None:
		# connection identity; all models in one query must share the same key
		self.key = key
		# PhysicalTableMapping.topicName; raw:-prefixed for DB_DIRECT relations
		self.table_ref = table_ref
		self.data_source_id = data_source_id
		self.node_relation = node_relation


class MySQLQueryContext:
	"""Resolved context for a metric that can bypass dbt and query MySQL directly."""

	def __init__(
			self, metric: Metric, metrics_by_name: Dict[str, Metric],
			semantic_models: List[SemanticModel], measure_models: Dict[str, SemanticModel],
			model_sources: Dict[str, MySQLModelSource]) -> None:
		self.metric = metric
		self.metrics_by_name = metrics_by_name
		self.semantic_models = semantic_models
		# measure name -> owning semantic model
		self.measure_models = measure_models
		# semantic model name -> MySQL source binding
		self.model_sources = model_sources
		self.binding = next(iter(model_sources.values()))


def _metric_type_value(metric: Metric) -> str:
	metric_type = metric.type
	return metric_type.value if isinstance(metric_type, MetricType) else str(metric_type)


def _source_type_value(model: SemanticModel) -> Optional[str]:
	source_type = model.sourceType
	if isinstance(source_type, SemanticModelSourceType):
		return source_type.value
	return source_type


def _collect_tree_measures(
		metric_name: str, metrics_by_name: Dict[str, Metric], visited: set, out: set) -> bool:
	"""Collect measure names referenced (transitively) by a metric.

	Returns False when a referenced name is neither a known measure nor a known
	metric (the dbt path then owns the error reporting).
	"""
	metric = metrics_by_name.get(metric_name)
	if metric is None:
		return False
	if metric_name in visited:
		return True
	visited.add(metric_name)
	params = metric.type_params
	metric_type = _metric_type_value(metric)
	measure_refs: List[MeasureReference] = []
	if metric_type in (MetricType.SIMPLE.value, MetricType.CUMULATIVE.value):
		measure_refs = [params.measure] if params and params.measure else []
	elif metric_type == MetricType.RATIO.value:
		measure_refs = [ref for ref in (params.numerator, params.denominator) if ref]
	elif metric_type == MetricType.DERIVED.value:
		for ref in (params.metrics or []):
			if ref.name and ref.name in metrics_by_name:
				if not _collect_tree_measures(ref.name, metrics_by_name, visited, out):
					return False
			elif ref.name:
				# derived refs must be metrics; unknown names fail the bypass
				return False
		measure_refs = list(params.input_measures or [])
	for ref in measure_refs:
		if ref is None or not ref.name:
			continue
		if ref.name in metrics_by_name:
			if not _collect_tree_measures(ref.name, metrics_by_name, visited, out):
				return False
		else:
			out.add(ref.name)
	return True


def _normalize_semantic_model(model: SemanticModel) -> SemanticModel:
	"""Coerce nested collections of a semantic model back to typed models.

	ExtendedBaseModel.__init__ re-injects the raw input after validation, so
	measures/entities/dimensions may still be plain dicts at this point.
	"""
	model.measures = [
		Measure.model_validate(measure) if isinstance(measure, dict) else measure
		for measure in (model.measures or [])]
	model.entities = [
		Entity.model_validate(entity) if isinstance(entity, dict) else entity
		for entity in (model.entities or [])]
	model.dimensions = [
		Dimension.model_validate(dimension) if isinstance(dimension, dict) else dimension
		for dimension in (model.dimensions or [])]
	return model


def _normalize_metric(metric: Metric) -> Metric:
	"""Coerce type_params of a metric back to a typed model (same raw-dict issue)."""
	if isinstance(metric.type_params, dict):
		metric.type_params = MetricTypeParams.model_validate(metric.type_params)
	return metric


def resolve_mysql_context(
		metric: Metric, metrics: List[Metric], semantic_models: List[SemanticModel],
		binding_resolver: Callable[[SemanticModel], Optional[MySQLModelSource]]
) -> Optional[MySQLQueryContext]:
	"""Decide whether a metric can bypass dbt and run against MySQL directly.

	Returns None when any measure in the metric's reference chain resolves to a
	non-MySQL data source, a different data source than the other measures, or
	cannot be resolved at all.
	"""
	_normalize_metric(metric)
	metrics_by_name = {item.name: _normalize_metric(item) for item in metrics}
	measure_models: Dict[str, SemanticModel] = {}
	for model in semantic_models:
		for measure in _normalize_semantic_model(model).measures:
			measure_models.setdefault(measure.name, model)
	measure_names: set = set()
	if not _collect_tree_measures(metric.name, metrics_by_name, set(), measure_names):
		return None
	if not measure_names:
		return None
	model_sources: Dict[str, MySQLModelSource] = {}
	for name in measure_names:
		model = measure_models.get(name)
		if model is None:
			return None
		if model.name in model_sources:
			continue
		source = binding_resolver(model)
		if source is None:
			return None
		model_sources[model.name] = source
	if len({source.key for source in model_sources.values()}) != 1:
		# measures spread over different connections are not supported
		return None
	return MySQLQueryContext(metric, metrics_by_name, semantic_models, measure_models, model_sources)


def _relation_table_name(relation_name: str) -> str:
	"""Take the table part of a dbt relation name (schema.table / `schema`.`table`)."""
	parts = [part.strip().strip('`"[]') for part in (relation_name or '').split('.') if part.strip()]
	if not parts:
		raise_400(f'Invalid relation name [{relation_name}] on DB_DIRECT semantic model.')
	return parts[-1]


def _production_binding_resolver(
		principal_service: PrincipalService
) -> Callable[[SemanticModel], Optional[MySQLModelSource]]:
	topic_service = get_topic_service(principal_service)
	data_source_service = get_data_source_service(principal_service)

	def resolver(model: SemanticModel) -> Optional[MySQLModelSource]:
		source_type = _source_type_value(model)
		if source_type == SemanticModelSourceType.TOPIC.value:
			topic = trans_readonly(topic_service, lambda: topic_service.find_by_id(model.topicId))
			if topic is None:
				return None
			data_source = trans_readonly(
				data_source_service, lambda: data_source_service.find_by_id(topic.dataSourceId))
			if data_source is None or data_source.dataSourceType != DataSourceType.MYSQL:
				return None
			# physical table follows the topic storage convention topic_{name}
			return MySQLModelSource(
				key=f'datasource:{topic.dataSourceId}',
				table_ref=topic.name.strip().lower(),
				data_source_id=topic.dataSourceId)
		if source_type == SemanticModelSourceType.DB_DIRECT.value:
			node_relation = model.node_relation
			if isinstance(node_relation, dict):
				node_relation = NodeRelation.model_validate(node_relation)
			if (node_relation.databaseType or '').lower() != DataSourceType.MYSQL.value:
				return None
			return MySQLModelSource(
				key=f'node:{node_relation.host}:{node_relation.port}:{node_relation.database}',
				table_ref=OntologyTableFactory.EXPLICIT_TABLE_PREFIX
				        + _relation_table_name(node_relation.relation_name),
				node_relation=node_relation)
		return None

	return resolver


# =============================================================================
# MetricFlow where DSL parsing
# =============================================================================

def _split_outside_quotes(text: str, separator_pattern: re.Pattern) -> List[str]:
	"""Split text on a separator regex, ignoring matches inside quotes."""
	parts: List[str] = []
	buffer: List[str] = []
	quote: Optional[str] = None
	index = 0
	while index < len(text):
		ch = text[index]
		if quote is not None:
			buffer.append(ch)
			if ch == quote:
				quote = None
			index += 1
			continue
		if ch in ('\'', '"'):
			quote = ch
			buffer.append(ch)
			index += 1
			continue
		match = separator_pattern.match(text, index)
		if match is not None:
			parts.append(''.join(buffer))
			buffer = []
			index = match.end()
			continue
		buffer.append(ch)
		index += 1
	parts.append(''.join(buffer))
	return parts


_AND_SPLIT_PATTERN = re.compile(r'\s+and\s+', re.IGNORECASE)
_CSV_SPLIT_PATTERN = re.compile(r'\s*,\s*')


def _parse_scalar_value(raw: str, where: str) -> Any:
	raw = raw.strip()
	if len(raw) >= 2 and raw[0] in ('\'', '"') and raw[-1] == raw[0]:
		return raw[1:-1]
	lower = raw.lower()
	if lower == 'true':
		return True
	if lower == 'false':
		return False
	try:
		return int(raw)
	except ValueError:
		pass
	try:
		return float(raw)
	except ValueError:
		pass
	raise_400(f'Unsupported filter value [{raw}] in where clause [{where}].')


def _parse_where_value(raw: str, where: str) -> Any:
	raw = raw.strip()
	if raw.startswith('(') and raw.endswith(')'):
		inner = raw[1:-1].strip()
		if not inner:
			raise_400(f'Empty IN list in where clause [{where}].')
		return [_parse_scalar_value(item, where) for item in _split_outside_quotes(inner, _CSV_SPLIT_PATTERN)]
	return _parse_scalar_value(raw, where)


def parse_where_filters(where: Optional[str]) -> List[Tuple[str, str, Any]]:
	"""Parse a MetricFlow where DSL string into (dimension name, operator, value) tuples.

	Supports {{ Dimension('x') }} / {{ Entity('x') }} / {{ TimeDimension('x', 'g') }}
	with =, !=, >, >=, <, <=, IN (...) combined by AND. Anything else is a 400.
	"""
	if where is None or len(where.strip()) == 0:
		return []
	conditions: List[Tuple[str, str, Any]] = []
	for part in _split_outside_quotes(where, _AND_SPLIT_PATTERN):
		match = _WHERE_CONDITION_PATTERN.match(part)
		if match is None:
			raise_400(f'Unsupported where clause [{part.strip()}] in [{where}].')
		operator = _OPERATOR_MAP[match.group(3).upper()]
		value = _parse_where_value(match.group(4), where)
		conditions.append((match.group(2), operator, value))
	return conditions


# =============================================================================
# Leaf query translation
# =============================================================================

class _GroupSpec:
	"""One output group-by column of a metric query."""

	def __init__(self, out_name: str, attr_name: str, granularity: Optional[str], is_time: bool) -> None:
		# original name from the request, used as the response column name
		self.out_name = out_name
		# attribute name on the synthetic virtual object
		self.attr_name = attr_name
		self.granularity = granularity
		self.is_time = is_time


def _normalize_granularity(granularity: Any) -> str:
	if isinstance(granularity, TimeGranularity):
		granularity = granularity.value
	value = str(granularity).strip().lower()
	if value.endswith('s') and value[:-1] in _GRANULARITIES:
		value = value[:-1]
	if value not in _GRANULARITIES:
		raise_400(f'Time granularity [{granularity}] is not supported.')
	return value


def _parse_group_specs(req: MetricQueryRequest, metric: Metric, force_time: bool) -> List[_GroupSpec]:
	default_granularity = _normalize_granularity(req.time_granularity or metric.time_granularity or 'day')
	specs: List[_GroupSpec] = []
	seen: set = set()
	for item in (req.group_by or []):
		item = (item or '').strip()
		if not item:
			continue
		if item == 'metric_time' or item.startswith('metric_time__'):
			parts = item.split('__')
			granularity = _normalize_granularity(parts[1]) if len(parts) > 1 and parts[1] \
				else default_granularity
			key = ('metric_time', granularity)
			if key not in seen:
				seen.add(key)
				specs.append(_GroupSpec(item, 'metric_time', granularity, True))
		else:
			# plain dimension name or entity-qualified dunder (entity__dimension)
			attr_name = item.split('__')[-1]
			key = (attr_name, None)
			if key not in seen:
				seen.add(key)
				specs.append(_GroupSpec(item, attr_name, None, False))
	if force_time and not any(spec.is_time for spec in specs):
		specs.append(_GroupSpec(f'metric_time__{default_granularity}', 'metric_time', default_granularity, True))
	return specs


def _resolve_time_expr(model: SemanticModel, measure: Optional[Measure]) -> str:
	time_dim_name = measure.agg_time_dimension if measure is not None else None
	defaults = model.defaults
	if not time_dim_name and defaults is not None:
		time_dim_name = defaults.get('agg_time_dimension') if isinstance(defaults, dict) \
			else defaults.agg_time_dimension
	if time_dim_name:
		dimension = model.get_dimension_by_name(time_dim_name)
		if dimension is not None:
			return dimension.expr
	time_dimensions = model.get_time_dimensions()
	if time_dimensions:
		return time_dimensions[0].expr
	raise_400(f'Semantic model [{model.name}] has no time dimension for metric_time.')


def _resolve_dimension_expr(model: SemanticModel, attr_name: str) -> str:
	dimension = model.get_dimension_by_name(attr_name)
	if dimension is not None:
		return dimension.expr
	entity = model.get_entity_by_name(attr_name)
	if entity is not None:
		return entity.expr
	raise_400(f'Dimension [{attr_name}] not found in semantic model [{model.name}].')


def _filter_attr_name(raw_name: str) -> str:
	raw_name = raw_name.strip()
	if raw_name == 'metric_time' or raw_name.startswith('metric_time__'):
		return 'metric_time'
	return raw_name.split('__')[-1]


def _add_months(value: Any, months: int) -> Any:
	"""Shift a date/datetime by months, clamping the day to the target month."""
	total = value.year * 12 + value.month - 1 + months
	year, month_index = divmod(total, 12)
	day = min(value.day, calendar.monthrange(year, month_index + 1)[1])
	return value.replace(year=year, month=month_index + 1, day=day)


def _shift_datetime(value: Optional[datetime], count: int, granularity: str) -> Optional[datetime]:
	if value is None:
		return None
	if granularity == 'day':
		return value + timedelta(days=count)
	if granularity == 'week':
		return value + timedelta(weeks=count)
	if granularity == 'month':
		return _add_months(value, count)
	if granularity == 'quarter':
		return _add_months(value, count * 3)
	# year
	return _add_months(value, count * 12)


def _format_datetime(value: Any) -> str:
	if isinstance(value, datetime):
		return value.strftime('%Y-%m-%d %H:%M:%S')
	return str(value)


def _build_filters(
		model: SemanticModel, measure: Measure, attributes: Dict[str, str],
		req: MetricQueryRequest, filter_strings: List[str],
		time_shift: List[Tuple[int, str]]) -> Dict[str, Any]:
	filters: Dict[str, Any] = {}
	for filter_string in filter_strings:
		for raw_name, operator, value in parse_where_filters(filter_string):
			attr_name = _filter_attr_name(raw_name)
			if attr_name not in attributes:
				attributes[attr_name] = _resolve_time_expr(model, measure) \
					if attr_name == 'metric_time' else _resolve_dimension_expr(model, attr_name)
			if attr_name in filters:
				raise_400(f'Conflicting filters on dimension [{attr_name}].')
			filters[attr_name] = value if operator == 'eq' \
				else {'operator': operator, 'value': value}
	start_time, end_time = req.start_time, req.end_time
	for count, granularity in time_shift:
		start_time = _shift_datetime(start_time, -count, granularity)
		end_time = _shift_datetime(end_time, -count, granularity)
	if start_time is not None or end_time is not None:
		if 'metric_time' not in attributes:
			attributes['metric_time'] = _resolve_time_expr(model, measure)
		if 'metric_time' in filters:
			raise_400('Time range conflicts with a metric_time filter.')
		if start_time is not None and end_time is not None:
			filters['metric_time'] = {
				'operator': 'between', 'value': [_format_datetime(start_time), _format_datetime(end_time)]}
		elif start_time is not None:
			filters['metric_time'] = {'operator': 'gte', 'value': _format_datetime(start_time)}
		else:
			filters['metric_time'] = {'operator': 'lte', 'value': _format_datetime(end_time)}
	return filters


def _build_leaf_query(
		specs: List[_GroupSpec], req: MetricQueryRequest, model: SemanticModel,
		measure: Measure, table_ref: str, filter_strings: List[str],
		time_shift: List[Tuple[int, str]]
) -> Tuple[VirtualOntology, OntologyQueryRequest, str]:
	"""Build the synthetic ontology + query request for one leaf measure aggregation."""
	leaf_label = measure.name
	attributes: Dict[str, str] = {}
	for spec in specs:
		attributes[spec.attr_name] = _resolve_time_expr(model, measure) \
			if spec.is_time else _resolve_dimension_expr(model, spec.attr_name)
	filters = _build_filters(model, measure, attributes, req, filter_strings, time_shift)

	agg_value = measure.agg.value if isinstance(measure.agg, AggregationType) else measure.agg
	aggregate = _AGGREGATE_MAP.get(agg_value)
	if aggregate is None:
		raise_400(f'Aggregation [{measure.agg}] of measure [{measure.name}] is not supported.')
	target_field = measure.expr
	if aggregate == 'count' and (target_field is None or target_field.strip() in ('', '*', '1')):
		target_field = None

	fields = set(attributes.values())
	if target_field:
		fields.add(target_field)
	mapping = PhysicalTableMapping(
		topicName=table_ref, alias='base', kind='primary', fields=sorted(fields))
	virtual_object = VirtualObject(
		id='metric_leaf', name='metric_leaf',
		physicalTables=[mapping],
		attributes=[
			VirtualObjectAttribute(name=name, sourceTable='base', sourceField=expr)
			for name, expr in attributes.items()],
		derivedAttributes=[
			DerivedAttribute(name=leaf_label, aggregate=aggregate, path=[], targetField=target_field)])
	ontology = VirtualOntology(
		ontologyId='metric_leaf_ontology', name='metric_leaf',
		virtualObjects=[virtual_object], virtualLinks=[])
	request = OntologyQueryRequest(
		virtualObjectId='metric_leaf',
		filters=filters,
		fields=[],
		groupBy=[OntologyGroupBy(field=spec.attr_name, granularity=spec.granularity) for spec in specs],
		includeDerived=[leaf_label],
		limit=10000)
	return ontology, request, leaf_label


# =============================================================================
# Leaf series and Python-layer combination
# =============================================================================

class _Series:
	"""Leaf metric values keyed by normalized group-by key tuples."""

	def __init__(
			self, values: Optional[Dict[tuple, Any]] = None,
			display: Optional[Dict[tuple, tuple]] = None,
			time_index: Optional[int] = None, time_granularity: Optional[str] = None,
			fill: Any = None) -> None:
		self.values = values or {}
		# raw (un-normalized) group-by values per key, for response assembly
		self.display = display or {}
		self.time_index = time_index
		self.time_granularity = time_granularity
		# fill_Nones_with, applied when a key is missing during alignment
		self.fill = fill

	def at(self, key: tuple) -> Any:
		return self.values.get(key, self.fill)


def _normalize_value(value: Any) -> Any:
	return None if value is None else str(value)


def _rows_to_series(rows: List[Dict[str, Any]], specs: List[_GroupSpec], leaf_label: str,
		fill: Any = None) -> _Series:
	time_index = next((index for index, spec in enumerate(specs) if spec.is_time), None)
	time_granularity = specs[time_index].granularity if time_index is not None else None
	values: Dict[tuple, Any] = {}
	display: Dict[tuple, tuple] = {}
	for row in rows:
		raw_key = tuple(row.get(spec.attr_name) for spec in specs)
		key = tuple(_normalize_value(item) for item in raw_key)
		values[key] = row.get(leaf_label)
		if key not in display:
			display[key] = raw_key
	return _Series(values, display, time_index, time_granularity, fill)


class _RunState:
	"""Per-request state shared by all leaf queries (specs, filters, executor)."""

	def __init__(
			self, context: MySQLQueryContext, specs: List[_GroupSpec], req: MetricQueryRequest,
			execute: Callable[[VirtualOntology, OntologyQueryRequest], List[Dict[str, Any]]]) -> None:
		self.context = context
		self.specs = specs
		self.req = req
		self.execute = execute

	def run_leaf(
			self, model: SemanticModel, measure: Measure, filter_strings: List[str],
			time_shift: List[Tuple[int, str]], fill: Any) -> _Series:
		source = self.context.model_sources[model.name]
		ontology, request, leaf_label = _build_leaf_query(
			self.specs, self.req, model, measure, source.table_ref, filter_strings, time_shift)
		rows = self.execute(ontology, request)
		return _rows_to_series(rows, self.specs, leaf_label, fill)


def _merge_filter_strings(filter_strings: List[str], extra: Optional[str]) -> List[str]:
	if extra is None or len(extra.strip()) == 0:
		return filter_strings
	return [*filter_strings, extra]


def _eval_measure_ref(
		state: _RunState, ref: MeasureReference, filter_strings: List[str],
		time_shift: List[Tuple[int, str]], visited: set) -> _Series:
	filters = _merge_filter_strings(filter_strings, ref.filter)
	if ref.name in state.context.measure_models:
		model = state.context.measure_models[ref.name]
		measure = model.get_measure_by_name(ref.name)
		return state.run_leaf(model, measure, filters, time_shift, ref.fill_Nones_with)
	if ref.name in state.context.metrics_by_name:
		return _eval_metric(state, ref.name, filters, time_shift, visited)
	raise_400(f'Measure or metric [{ref.name}] not found.')


def _eval_metric(
		state: _RunState, metric_name: str, filter_strings: List[str],
		time_shift: List[Tuple[int, str]], visited: set) -> _Series:
	metric = state.context.metrics_by_name.get(metric_name)
	if metric is None:
		raise_400(f'Metric [{metric_name}] not found.')
	if metric_name in visited:
		raise_400(f'Circular metric reference [{metric_name}].')
	visited = visited | {metric_name}
	filters = _merge_filter_strings(filter_strings, metric.filter)
	params = metric.type_params
	metric_type = _metric_type_value(metric)
	if metric_type == MetricType.SIMPLE.value:
		return _eval_measure_ref(state, params.measure, filters, time_shift, visited)
	if metric_type == MetricType.RATIO.value:
		numerator = _eval_measure_ref(state, params.numerator, filters, time_shift, visited)
		denominator = _eval_measure_ref(state, params.denominator, filters, time_shift, visited)
		return _ratio_series(numerator, denominator)
	if metric_type == MetricType.CUMULATIVE.value:
		series = _eval_measure_ref(state, params.measure, filters, time_shift, visited)
		return _cumulative_series(series, params)
	if metric_type == MetricType.DERIVED.value:
		return _derived_series(state, params, filters, time_shift, visited)
	if metric_type == MetricType.CONVERSION.value:
		raise_400('Conversion metric semantics not defined.')
	raise_400(f'Metric type [{metric_type}] is not supported by MySQL metric query.')


def _merged_display(*series_list: _Series) -> Dict[tuple, tuple]:
	display: Dict[tuple, tuple] = {}
	for series in series_list:
		for key, raw in series.display.items():
			display.setdefault(key, raw)
	return display


def _ratio_series(numerator: _Series, denominator: _Series) -> _Series:
	keys = set(numerator.values.keys()) | set(denominator.values.keys())
	values: Dict[tuple, Any] = {}
	for key in keys:
		num = numerator.at(key)
		den = denominator.at(key)
		if num is None or den is None or den == 0:
			values[key] = None
		else:
			values[key] = num / den
	return _Series(
		values, _merged_display(numerator, denominator),
		numerator.time_index, numerator.time_granularity)


# ---- derived (safe expr evaluation) ------------------------------------------

_ALLOWED_BIN_OPS = (ast.Add, ast.Sub, ast.Mult, ast.Div)
_ALLOWED_UNARY_OPS = (ast.UAdd, ast.USub)


def _eval_expr_node(node: ast.AST, env: Dict[str, Any], expr: str) -> Any:
	if isinstance(node, ast.Expression):
		return _eval_expr_node(node.body, env, expr)
	if isinstance(node, ast.Constant):
		if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
			raise_400(f'Only numeric constants are allowed in derived metric expr [{expr}].')
		return node.value
	if isinstance(node, ast.Name):
		if node.id not in env:
			raise_400(f'Unknown metric name [{node.id}] in derived metric expr [{expr}].')
		return env[node.id]
	if isinstance(node, ast.BinOp) and isinstance(node.op, _ALLOWED_BIN_OPS):
		left = _eval_expr_node(node.left, env, expr)
		right = _eval_expr_node(node.right, env, expr)
		if left is None or right is None:
			return None
		if isinstance(node.op, ast.Div) and right == 0:
			return None
		if isinstance(node.op, ast.Add):
			return left + right
		if isinstance(node.op, ast.Sub):
			return left - right
		if isinstance(node.op, ast.Mult):
			return left * right
		return left / right
	if isinstance(node, ast.UnaryOp) and isinstance(node.op, _ALLOWED_UNARY_OPS):
		value = _eval_expr_node(node.operand, env, expr)
		if value is None:
			return None
		return value if isinstance(node.op, ast.UAdd) else -value
	raise_400(f'Unsupported expression [{expr}]; only constants, metric names and + - * / are allowed.')


def _safe_eval_expr(expr: str, env: Dict[str, Any]) -> Any:
	try:
		tree = ast.parse(expr, mode='eval')
	except SyntaxError:
		raise_400(f'Derived metric expr [{expr}] is not valid Python expression syntax.')
	return _eval_expr_node(tree, env, expr)


def _ref_time_shift(ref: MetricRef) -> List[Tuple[int, str]]:
	shift: List[Tuple[int, str]] = []
	if ref.offset_window is not None and ref.offset_window.count:
		shift.append((ref.offset_window.count, _normalize_granularity(ref.offset_window.granularity)))
	if ref.offset_to_grain:
		# snap-to-grain reads earlier data; expand the time range by one grain
		shift.append((1, _normalize_granularity(ref.offset_to_grain)))
	return shift


def _apply_ref_offset(series: _Series, ref: MetricRef) -> _Series:
	if ref.offset_window is None and not ref.offset_to_grain:
		return series
	if series.time_index is None:
		raise_400(f'Offset on metric ref [{ref.name}] requires metric_time in group by.')
	time_index = series.time_index
	granularity = series.time_granularity
	values: Dict[tuple, Any] = {}
	display: Dict[tuple, tuple] = {}
	for key, value in series.values.items():
		time_key = key[time_index]
		if time_key is None:
			continue
		if ref.offset_window is not None and ref.offset_window.count:
			time_key = _shift_time_key(
				time_key, granularity, ref.offset_window.count,
				_normalize_granularity(ref.offset_window.granularity))
		if ref.offset_to_grain:
			time_key = _snap_time_key(time_key, granularity, _normalize_granularity(ref.offset_to_grain))
		new_key = key[:time_index] + (time_key,) + key[time_index + 1:]
		values[new_key] = value
		raw = series.display.get(key, key)
		display[new_key] = raw[:time_index] + (time_key,) + raw[time_index + 1:]
	return _Series(values, display, series.time_index, series.time_granularity, series.fill)


def _derived_series(
		state: _RunState, params: Any, filter_strings: List[str],
		time_shift: List[Tuple[int, str]], visited: set) -> _Series:
	expr = params.expr
	if not expr:
		raise_400('Derived metric requires type_params.expr.')
	series_by_name: Dict[str, _Series] = {}
	# series of refs without offset define the output key set; offset refs only
	# contribute values aligned onto those keys (shifted times stay out of output)
	base_series: List[_Series] = []
	for ref in (params.metrics or []):
		filters = _merge_filter_strings(filter_strings, ref.filter)
		ref_shift = _ref_time_shift(ref)
		ref_series = _eval_metric(state, ref.name, filters, [*time_shift, *ref_shift], visited)
		if not ref_shift:
			base_series.append(ref_series)
		series_by_name[ref.alias or ref.name] = _apply_ref_offset(ref_series, ref)
	all_series = list(series_by_name.values())
	keys: set = set()
	for series in (base_series or all_series):
		keys |= set(series.values.keys())
	values: Dict[tuple, Any] = {}
	for key in keys:
		env = {name: series.at(key) for name, series in series_by_name.items()}
		values[key] = _safe_eval_expr(expr, env)
	first = all_series[0] if all_series else _Series()
	return _Series(values, _merged_display(*all_series), first.time_index, first.time_granularity)


# ---- cumulative ---------------------------------------------------------------

def _parse_time_key(key: str, granularity: str) -> date:
	if granularity == 'day':
		return datetime.strptime(key, '%Y-%m-%d').date()
	if granularity == 'week':
		year, week = key.split('-')
		return datetime.strptime(f'{year}-W{int(week)}-1', '%G-W%V-%u').date()
	if granularity == 'month':
		return datetime.strptime(key, '%Y-%m').date()
	if granularity == 'quarter':
		year, quarter = key.split('-Q')
		return date(int(year), (int(quarter) - 1) * 3 + 1, 1)
	# year
	return date(int(key), 1, 1)


def _format_time_key(value: date, granularity: str) -> str:
	if granularity == 'day':
		return value.strftime('%Y-%m-%d')
	if granularity == 'week':
		iso = value.isocalendar()
		return f'{iso[0]}-{iso[1]:02d}'
	if granularity == 'month':
		return value.strftime('%Y-%m')
	if granularity == 'quarter':
		return f'{value.year}-Q{(value.month - 1) // 3 + 1}'
	return f'{value.year}'


def _shift_time_key(key: str, granularity: str, count: int, shift_granularity: str) -> str:
	"""Shift a truncated time key by count x shift_granularity, keep the key's format."""
	value = _parse_time_key(key, granularity)
	value = _shift_datetime(value, count, shift_granularity)
	return _format_time_key(value, granularity)


def _snap_time_key(key: str, granularity: str, snap_granularity: str) -> str:
	"""Snap a truncated time key back to the start of the given grain."""
	value = _parse_time_key(key, granularity)
	if snap_granularity == 'week':
		value = value - timedelta(days=value.weekday())
	elif snap_granularity == 'month':
		value = value.replace(day=1)
	elif snap_granularity == 'quarter':
		value = value.replace(month=(value.month - 1) // 3 * 3 + 1, day=1)
	elif snap_granularity == 'year':
		value = value.replace(month=1, day=1)
	# day: nothing to snap
	return _format_time_key(value, granularity)


def _period_key(time_key: str, leaf_granularity: str, grain: str) -> str:
	"""The period bucket (for grain_to_date resets) a time key belongs to."""
	value = _parse_time_key(time_key, leaf_granularity)
	return _format_time_key(value, grain)


def _cumulative_series(series: _Series, params: Any) -> _Series:
	if series.time_index is None:
		raise_400('Cumulative metric requires metric_time in group by.')
	time_index = series.time_index
	granularity = series.time_granularity
	grain_to_date = _normalize_granularity(params.grain_to_date) if params.grain_to_date else None
	window_count: Optional[int] = None
	window = params.window
	if window is not None and window.count:
		window_granularity = window.granularity or granularity
		if _normalize_granularity(window_granularity) != granularity:
			raise_400(
				'Cumulative window granularity must match the query time granularity '
				f'[{granularity}].')
		window_count = window.count
	# group keys by the non-time dimensions
	groups: Dict[tuple, List[tuple]] = {}
	for key in series.values.keys():
		dims = key[:time_index] + key[time_index + 1:]
		groups.setdefault(dims, []).append(key)
	values: Dict[tuple, Any] = {}
	for keys in groups.values():
		ordered = sorted(keys, key=lambda key: (key[time_index] is None, key[time_index]))
		accumulator = 0
		period: Optional[str] = None
		trailing: List[Any] = []
		for key in ordered:
			value = series.values.get(key) or 0
			if window_count is not None:
				trailing.append(value)
				trailing = trailing[-window_count:]
				values[key] = sum(trailing)
			else:
				if grain_to_date is not None:
					current = _period_key(key[time_index], granularity, grain_to_date)
					if current != period:
						period = current
						accumulator = 0
				accumulator = accumulator + value
				values[key] = accumulator
	return _Series(values, series.display, series.time_index, series.time_granularity)


def _tree_needs_time(metric_name: str, metrics_by_name: Dict[str, Metric], visited: set) -> bool:
	"""True when any metric in the reference chain is cumulative (needs metric_time)."""
	if metric_name in visited:
		return False
	metric = metrics_by_name.get(metric_name)
	if metric is None:
		return False
	visited.add(metric_name)
	params = metric.type_params
	metric_type = _metric_type_value(metric)
	if metric_type == MetricType.CUMULATIVE.value:
		return True
	names: List[str] = []
	if metric_type == MetricType.DERIVED.value:
		names = [ref.name for ref in (params.metrics or []) if ref.name]
	else:
		refs = []
		if metric_type in (MetricType.SIMPLE.value, MetricType.CUMULATIVE.value) and params.measure:
			refs = [params.measure]
		elif metric_type == MetricType.RATIO.value:
			refs = [ref for ref in (params.numerator, params.denominator) if ref]
		names = [ref.name for ref in refs if ref.name in metrics_by_name]
	return any(_tree_needs_time(name, metrics_by_name, visited) for name in names)


# =============================================================================
# Response assembly
# =============================================================================

def _order_column_index(field: str, column_names: List[str], metric_name: str) -> Optional[int]:
	if field == metric_name or field == 'metric':
		return len(column_names) - 1
	if field in column_names:
		return column_names.index(field)
	# allow attribute-style references (entity__dimension, metric_time__month)
	attr_name = 'metric_time' if field.startswith('metric_time') else field.split('__')[-1]
	for index, name in enumerate(column_names):
		candidate = 'metric_time' if name.startswith('metric_time') else name.split('__')[-1]
		if candidate == attr_name:
			return index
	return None


def _apply_order(
		rows: List[tuple], column_names: List[str], order: Optional[List[str]],
		metric_name: str) -> List[tuple]:
	if not order:
		return rows
	ordered = list(rows)
	for entry in reversed(order):
		entry = (entry or '').strip()
		if not entry:
			continue
		desc = entry.startswith('-')
		field = entry[1:] if desc else entry.lstrip('+')
		index = _order_column_index(field, column_names, metric_name)
		if index is None:
			continue
		ordered.sort(key=lambda row, i=index: (row[i] is None, row[i]), reverse=desc)
	return ordered


def _to_response(metric_name: str, specs: List[_GroupSpec], series: _Series, req: MetricQueryRequest):
	# lazy import to avoid a circular import with the router module
	from watchmen_metricflow.router.metric_router import MetricFlowResponse

	column_names = [spec.out_name for spec in specs] + [metric_name]
	rows = [tuple(series.display.get(key, key)) + (value,) for key, value in series.values.items()]
	rows = _apply_order(rows, column_names, req.order, metric_name)
	if req.limit is not None and req.limit >= 0:
		rows = rows[:req.limit]
	return MetricFlowResponse(data=tuple(rows), column_names=column_names)


# =============================================================================
# Runner and public entry
# =============================================================================

def _create_db_direct_engine(node_relation: NodeRelation) -> Engine:
	"""Build a SQLAlchemy engine from a DB_DIRECT semantic model's node relation."""
	from watchmen_storage_mysql import MySQLDataSourceHelper
	data_source = DataSource(
		dataSourceType=DataSourceType.MYSQL,
		host=node_relation.host,
		port=str(node_relation.port) if node_relation.port is not None else None,
		username=node_relation.username,
		password=node_relation.password,
		name=node_relation.database,
		params=[DataSourceParam(name='schema', value=node_relation.schema_name)]
			if node_relation.schema_name else [])
	return MySQLDataSourceHelper(data_source).engine


class MySQLMetricQueryRunner:
	"""Executes one metric query through the ontology SQL compiler against MySQL."""

	def __init__(
			self, context: MySQLQueryContext, principal_service: Optional[PrincipalService] = None,
			engine: Optional[Engine] = None,
			execute_leaf: Optional[
				Callable[[VirtualOntology, OntologyQueryRequest], List[Dict[str, Any]]]] = None
	) -> None:
		self.context = context
		self.principal_service = principal_service
		self.engine = engine
		# injectable leaf executor for tests; production executes via SQLAlchemy
		self._execute_leaf = execute_leaf
		self._compiler = OntologySqlCompiler()

	def run(self, req: MetricQueryRequest):
		metric = self.context.metric
		force_time = _tree_needs_time(metric.name, self.context.metrics_by_name, set())
		specs = _parse_group_specs(req, metric, force_time)
		state = _RunState(self.context, specs, req, self.execute)
		series = _eval_metric(state, metric.name, [], [], set())
		return _to_response(metric.name, specs, series, req)

	def execute(self, ontology: VirtualOntology, request: OntologyQueryRequest) -> List[Dict[str, Any]]:
		if self._execute_leaf is not None:
			return self._execute_leaf(ontology, request)
		engine = self._resolve_engine()
		compiled = self._compiler.compile(ontology, request, dialect_name=engine.dialect.name)
		with engine.connect() as conn:
			return [dict(row._mapping) for row in conn.execute(compiled.statement).fetchall()]

	def _resolve_engine(self) -> Engine:
		# one engine per request, shared by all leaf queries
		if self.engine is None:
			binding = self.context.binding
			if binding.data_source_id is not None:
				provider = OntologyRdsEngineProvider(self.principal_service)
				# get_engine reads the DataSource metadata from meta storage,
				# which requires an open transaction/connection
				self.engine = trans_readonly(
					provider.data_source_service,
					lambda: provider.get_engine(binding.data_source_id))
			else:
				self.engine = _create_db_direct_engine(binding.node_relation)
		return self.engine


async def try_mysql_metric_query(req: MetricQueryRequest, principal_service: PrincipalService):
	"""Run a metric query through the MySQL bypass when applicable.

	Returns a MetricFlowResponse when the metric's whole reference chain resolves
	to MySQL data sources, otherwise None (caller falls through to the dbt path).
	"""
	metrics: List[Metric] = await load_metrics_by_tenant_id(principal_service)
	metric = next((item for item in metrics if item.name == req.metric), None)
	if metric is None:
		return None
	if _metric_type_value(metric) == MetricType.CONVERSION.value:
		# ConversionTypeParams is an empty model: no defined semantics anywhere
		raise_400('Conversion metric semantics not defined.')
	semantic_models: List[SemanticModel] = await load_semantic_models_by_tenant_id(principal_service)
	context = resolve_mysql_context(
		metric, metrics, semantic_models, _production_binding_resolver(principal_service))
	if context is None:
		return None
	return MySQLMetricQueryRunner(context, principal_service).run(req)


async def try_mysql_dimensions_by_metrics(
		metric_names: List[str], principal_service: PrincipalService) -> Optional[DimensionListResponse]:
	"""Answer dimension discovery from metadata when every requested metric resolves to MySQL.

	Returns a DimensionListResponse built from the semantic models backing the metrics,
	otherwise None (caller falls through to the dbt path).
	"""
	metrics: List[Metric] = await load_metrics_by_tenant_id(principal_service)
	metrics_by_name = {item.name: item for item in metrics}
	requested = [metrics_by_name.get(name) for name in metric_names]
	if any(item is None for item in requested):
		return None
	semantic_models: List[SemanticModel] = await load_semantic_models_by_tenant_id(principal_service)
	resolver = _production_binding_resolver(principal_service)
	binding_key: Optional[str] = None
	models: Dict[str, SemanticModel] = {}
	for metric in requested:
		context = resolve_mysql_context(metric, metrics, semantic_models, resolver)
		if context is None:
			return None
		if binding_key is None:
			binding_key = context.binding.key
		elif binding_key != context.binding.key:
			# metrics spread over different connections are not supported
			return None
		# only the models owning the measures actually referenced by this metric
		measure_names: set = set()
		if not _collect_tree_measures(metric.name, context.metrics_by_name, set(), measure_names):
			return None
		for name in measure_names:
			model = context.measure_models.get(name)
			if model is not None:
				models.setdefault(model.name, model)

	dimension_infos: List[DimensionInfo] = []
	seen: set = set()
	for model in models.values():
		for dimension in (model.dimensions or []):
			if dimension.name in seen:
				continue
			seen.add(dimension.name)
			dimension_type = dimension.type
			type_name = dimension_type.name if isinstance(dimension_type, DimensionType) \
				else str(dimension_type).upper()
			dimension_infos.append(DimensionInfo(
				name=dimension.name, qualified_name=dimension.name,
				description=dimension.description, type=type_name))
	# metric_time is always available on the MySQL path (see _parse_group_specs)
	if 'metric_time' not in seen:
		dimension_infos.append(DimensionInfo(
			name='metric_time', qualified_name='metric_time',
			description='Event time for the metric', type=DimensionType.TIME.name))
	return DimensionListResponse(dimensions=dimension_infos, total_count=len(dimension_infos))
