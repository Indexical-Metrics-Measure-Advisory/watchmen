from datetime import datetime
from logging import getLogger
from math import isinf, isnan
from typing import Any, Dict, List, Optional, Tuple

from pandas import DataFrame, NaT, Series
from pandas.api.types import (
	is_bool_dtype, is_datetime64_any_dtype, is_numeric_dtype, is_object_dtype, is_string_dtype)

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_dqc.common import DqcException
from watchmen_dqc.util import build_data_frame, convert_data_frame_type_by_topic
from watchmen_model.admin import is_raw_topic
from watchmen_model.common import TopicId
from watchmen_model.dqc import TopicProfile
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)

VALUE_COUNTS_LIMIT = 20
HIGH_CARDINALITY_RATIO = 0.9


def to_json_value(value: Any) -> Any:
	# convert a value into json serializable, nan and infinite values become none
	if value is None:
		return None
	if isinstance(value, bool):
		return value
	if isinstance(value, str):
		return value
	if value is NaT:
		# not-a-time value is a datetime instance as well, check it in advance
		return None
	if isinstance(value, datetime):
		return value.isoformat(sep=' ')
	try:
		if isnan(value) or isinf(value):
			return None
		if isinstance(value, (int, float)):
			return value
		return value.item()
	except (TypeError, ValueError, AttributeError):
		return str(value)


def ask_factor_type(series: Series) -> str:
	if is_datetime64_any_dtype(series):
		return 'DateTime'
	elif is_bool_dtype(series):
		return 'Categorical'
	elif is_numeric_dtype(series):
		return 'Numeric'
	# string dtype on pandas 3.0+, object dtype holds strings on pandas 2.x
	elif is_string_dtype(series) or is_object_dtype(series):
		return 'Categorical'
	else:
		return 'Unsupported'


def build_value_counts(series: Series) -> Dict[str, int]:
	try:
		value_counts = series.value_counts(dropna=True).head(VALUE_COUNTS_LIMIT)
		return {str(key): int(count) for key, count in value_counts.items()}
	except TypeError:
		# values are not hashable, cannot be counted
		return {}


def build_warnings(name: str, factor_type: str, n_distinct: int, count: int, p_distinct: float, n_missing: int) -> List[str]:
	warnings = []
	if count > 0 and n_distinct <= 1:
		warnings.append('CONSTANT')
	if count > 1 and n_distinct == count:
		warnings.append('UNIQUE')
	if count > 0 and p_distinct >= HIGH_CARDINALITY_RATIO and n_distinct > 1:
		warnings.append('HIGH_CARDINALITY')
	if n_missing > 0:
		warnings.append('MISSING')
	if factor_type == 'Unsupported':
		warnings.append('UNSUPPORTED')
	return [f'[{warning}] warning on column {name}' for warning in warnings]


def build_factor_profile(name: str, series: Series) -> Tuple[Dict[str, Any], List[str]]:
	n = len(series.index)
	count = int(series.count())
	n_missing = n - count
	n_distinct = int(series.nunique(dropna=True))
	p_missing = n_missing / n if n > 0 else 0.0
	p_distinct = n_distinct / count if count > 0 else 0.0
	factor_type = ask_factor_type(series)
	value_counts = build_value_counts(series)

	factor: Dict[str, Any] = {
		'n_distinct': n_distinct,
		'p_distinct': p_distinct,
		'is_unique': count > 0 and n_distinct == count,
		'n_unique': n_distinct,
		'p_unique': p_distinct,
		'type': factor_type,
		'hashable': True,
		'value_counts_without_nan': value_counts,
		'value_counts_index_sorted': {},
		'ordering': False,
		'n_missing': n_missing,
		'n': n,
		'p_missing': p_missing,
		'count': count,
		'memory_size': int(series.memory_usage(deep=True)),
	}

	if factor_type == 'Numeric':
		factor.update({
			'n_zeros': int((series == 0).sum()),
			'p_zeros': float((series == 0).sum() / count) if count > 0 else 0.0,
			'n_negative': int((series < 0).sum()),
			'p_negative': float((series < 0).sum() / count) if count > 0 else 0.0,
			'n_infinite': int((series == float('inf')).sum() + (series == float('-inf')).sum()),
			'mean': to_json_value(series.mean()),
			'std': to_json_value(series.std()),
			'variance': to_json_value(series.var()),
			'min': to_json_value(series.min()),
			'max': to_json_value(series.max()),
			'sum': to_json_value(series.sum()),
			'5%': to_json_value(series.quantile(0.05)),
			'25%': to_json_value(series.quantile(0.25)),
			'50%': to_json_value(series.quantile(0.5)),
			'75%': to_json_value(series.quantile(0.75)),
			'95%': to_json_value(series.quantile(0.95)),
		})
	elif factor_type == 'DateTime':
		min_value, max_value = to_json_value(series.min()), to_json_value(series.max())
		factor.update({
			'min': min_value,
			'max': max_value,
			'range': str(series.max() - series.min()) if min_value is not None and max_value is not None else None,
		})
	elif factor_type == 'Categorical':
		top = series.mode(dropna=True)
		factor['mode'] = str(top.iloc[0]) if len(top.index) > 0 else None
	elif not value_counts:
		# neither known type nor countable values
		factor['hashable'] = False

	return factor, build_warnings(name, factor_type, n_distinct, count, p_distinct, n_missing)


def build_topic_profile(data_frame: DataFrame, topic_name: str) -> TopicProfile:
	start_time = datetime.now()

	n = len(data_frame.index)
	variables: Dict[str, Any] = {}
	messages: List[str] = []
	type_counts = {'Categorical': 0, 'Numeric': 0, 'DateTime': 0, 'Unsupported': 0}
	n_cells_missing, n_vars_with_missing, n_vars_all_missing = 0, 0, 0

	for name in data_frame.columns:
		factor, factor_messages = build_factor_profile(str(name), data_frame[name])
		variables[str(name)] = factor
		messages.extend(factor_messages)
		type_counts[factor['type']] += 1
		if factor['n_missing'] > 0:
			n_cells_missing += factor['n_missing']
			n_vars_with_missing += 1
		if factor['count'] == 0:
			n_vars_all_missing += 1

	memory_size = int(data_frame.memory_usage(deep=True).sum())
	n_var = len(data_frame.columns)
	end_time = datetime.now()

	return {
		'analysis': {
			'title': f'{topic_name} data profile report',
			'date_start': str(start_time),
			'date_end': str(end_time),
			'duration': str(end_time - start_time),
		},
		'table': {
			'n': n,
			'n_var': n_var,
			'memory_size': memory_size,
			'record_size': float(memory_size / n) if n > 0 else 0.0,
			'n_cells_missing': n_cells_missing,
			'n_vars_with_missing': n_vars_with_missing,
			'n_vars_all_missing': n_vars_all_missing,
			'p_cells_missing': n_cells_missing / (n * n_var) if n > 0 and n_var > 0 else 0.0,
			'types': type_counts,
		},
		'variables': variables,
		'scatter': {},
		'correlations': {},
		'missing': {},
		'messages': messages,
		'package': {
			'pandas_profiling_version': 'watchmen-lightweight',
			'pandas_profiling_config': '',
		},
		'sample': [],
		'duplicates': 'None',
	}


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_topic_schema(
		topic_id: TopicId, principal_service: PrincipalService) -> TopicSchema:
	topic_service = get_topic_service(principal_service)
	topic = get_topic_service(principal_service).find_by_id(topic_id)
	if topic is None:
		raise DataKernelException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise DataKernelException(f'Topic[name={topic.name}] not found.')
	return schema


class TopicProfileService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find(self, topic_id: TopicId, start_time: datetime, end_time: datetime) -> Optional[TopicProfile]:
		schema = get_topic_schema(topic_id, self.principalService)
		if is_raw_topic(schema.get_topic()):
			raise DqcException(f'Raw topic[name={schema.get_topic().name}] is not supported for profiling.')
		storage = ask_topic_storage(schema, self.principalService)
		service = ask_topic_data_service(schema, storage, self.principalService)
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.TENANT_ID.value),
				right=self.principalService.get_tenant_id()),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=start_time),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=end_time)
		]
		data = service.find(criteria)

		columns = [
			TopicDataColumnNames.ID.value,
			*ArrayHelper(schema.get_topic().factors).map(lambda x: x.name).to_list(),
			TopicDataColumnNames.TENANT_ID.value,
			TopicDataColumnNames.INSERT_TIME.value,
			TopicDataColumnNames.UPDATE_TIME.value
		]

		def row_to_list(row: Dict[str, Any]) -> List[Any]:
			return ArrayHelper(columns).map(lambda x: row.get(x)).to_list()

		data_frame = build_data_frame(ArrayHelper(data).map(row_to_list).to_list(), columns)
		data_frame = convert_data_frame_type_by_topic(data_frame, schema.get_topic())
		data_frame.drop([
			TopicDataColumnNames.TENANT_ID,
			TopicDataColumnNames.UPDATE_TIME,
			TopicDataColumnNames.INSERT_TIME,
			TopicDataColumnNames.AGGREGATE_ASSIST,
			TopicDataColumnNames.ID,
			TopicDataColumnNames.VERSION
		], axis=1, inplace=True, errors='ignore')

		if data_frame.empty or len(data_frame.index) == 1:
			return None
		else:
			logger.info(f'memory_usage {data_frame.memory_usage(deep=True).sum()} bytes')
			return build_topic_profile(data_frame, schema.get_topic().name)