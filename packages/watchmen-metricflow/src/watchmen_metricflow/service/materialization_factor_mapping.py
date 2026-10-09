from datetime import date, datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

from watchmen_metricflow.model.materialization import FactorMappingColumn, FactorRole, Materialization, TimeGrain
from watchmen_utilities import is_blank
from .materialization_error import MaterializationError

TIME_COLUMN_NAME = 'statDate'
TIME_GRAIN_COLUMN_NAME = 'timeGrain'
METRIC_VALUE_COLUMN_NAME = 'metricValue'
TIME_SOURCE_PREFIX = 'metric_time'

DATE_FACTOR_TYPES = ('date',)
NUMBER_FACTOR_TYPES = ('number', 'unsigned')
BOOLEAN_FACTOR_TYPES = ('boolean',)


def build_default_factor_mapping(
		mmetric_name: str, time_grain: Any, group_by: Optional[Sequence[str]]
) -> List[FactorMappingColumn]:
	"""Default wide table layout: statDate + timeGrain + dimensions + metricValue."""
	# keep the parameter name typo free
	metric_name = mmetric_name
	grain = TimeGrain(time_grain).value if not isinstance(time_grain, str) else time_grain
	columns = [
		FactorMappingColumn(
			columnName=TIME_COLUMN_NAME, factorName=TIME_COLUMN_NAME, factorType='date',
			role=FactorRole.TIME, source=f'{TIME_SOURCE_PREFIX}__{grain}'),
		FactorMappingColumn(
			columnName=TIME_GRAIN_COLUMN_NAME, factorName=TIME_GRAIN_COLUMN_NAME, factorType='text',
			role=FactorRole.META, source=grain)
	]
	for dimension in group_by or []:
		if is_blank(dimension):
			continue
		columns.append(FactorMappingColumn(
			columnName=dimension, factorName=dimension, factorType='text',
			role=FactorRole.DIMENSION, source=dimension))
	columns.append(FactorMappingColumn(
		columnName=METRIC_VALUE_COLUMN_NAME, factorName=metric_name, factorType='number',
		role=FactorRole.METRIC, source=metric_name))
	return columns


def get_effective_factor_mapping(materialization: Materialization) -> List[FactorMappingColumn]:
	"""Stored mapping wins, otherwise the default layout for this materialization."""
	if materialization.factorMapping:
		return list(materialization.factorMapping)
	return build_default_factor_mapping(
		materialization.metricName or '', materialization.timeGrain, materialization.groupBy)


def business_key_column_names(materialization: Materialization) -> List[str]:
	"""statDate + dimension columns, the natural key of a materialized row."""
	return [
		column.columnName
		for column in get_effective_factor_mapping(materialization)
		if column.role in (FactorRole.TIME, FactorRole.DIMENSION) and not is_blank(column.columnName)
	]


def to_column_name(factor_name: str) -> str:
	"""Physical column name of a factor, same rule as the topic data shaper/table creator."""
	return factor_name.strip().lower().replace('.', '_').replace('-', '_').replace(' ', '_')


def find_missing_dimensions(column_names: Sequence[str], group_by: Optional[Sequence[str]]) -> List[str]:
	"""Dimensions requested by the materialization but absent from the query result."""
	available = set(column_names)
	return [
		dimension for dimension in group_by or []
		if not is_blank(dimension) and dimension not in available
	]


def find_time_column(column_names: Sequence[str], time_grain: Any) -> Optional[str]:
	grain = TimeGrain(time_grain).value if not isinstance(time_grain, str) else time_grain
	expected = f'{TIME_SOURCE_PREFIX}__{grain}'
	if expected in column_names:
		return expected
	if TIME_SOURCE_PREFIX in column_names:
		return TIME_SOURCE_PREFIX
	for name in column_names:
		if str(name).startswith(f'{TIME_SOURCE_PREFIX}__'):
			return name
	return None


def _cast_value(factor_type: Optional[str], column_name: str, value: Any) -> Any:
	if value is None:
		return None
	if factor_type in DATE_FACTOR_TYPES:
		if isinstance(value, datetime):
			return value.date()
		if isinstance(value, date):
			return value
		try:
			return date.fromisoformat(str(value).strip()[:10])
		except ValueError:
			raise MaterializationError(
				f'Column [{column_name}] value [{value}] cannot be parsed as a date.')
	if factor_type in NUMBER_FACTOR_TYPES:
		try:
			return float(value)
		except (ValueError, TypeError):
			raise MaterializationError(
				f'Column [{column_name}] value [{value}] cannot be parsed as a number.')
	if factor_type in BOOLEAN_FACTOR_TYPES:
		return bool(value)
	return value if isinstance(value, str) else str(value)


def map_result_rows(
		column_names: Sequence[str], rows: Sequence[Sequence[Any]],
		time_grain: Any, mapping: Optional[List[FactorMappingColumn]] = None,
		materialization: Optional[Materialization] = None
) -> List[Dict[str, Any]]:
	"""
	Convert query result rows into topic data rows keyed by factor name.

	source carries the query result column (metric_time__day, dimension name,
	metric name); for the meta timeGrain column source holds the constant grain.
	"""
	if mapping is None:
		if materialization is None:
			raise MaterializationError('Factor mapping is required to map query results.')
		mapping = get_effective_factor_mapping(materialization)

	index = {str(name): position for position, name in enumerate(column_names)}
	time_column = find_time_column(column_names, time_grain)

	def pick_raw(column: FactorMappingColumn, row: Sequence[Any]) -> Any:
		for key in (column.source, column.columnName):
			if key and key in index:
				return row[index[key]]
		return None

	mapped_rows: List[Dict[str, Any]] = []
	for row in rows:
		item: Dict[str, Any] = {}
		for column in mapping:
			if column.role == FactorRole.TIME:
				raw = row[index[time_column]] if time_column is not None else None
				if raw is None and column.source in index:
					raw = row[index[column.source]]
				if raw is None:
					raise MaterializationError(
						'Time dimension is missing from the metric query result.')
			elif column.role == FactorRole.META:
				# constant meta column, e.g. timeGrain = 'day'
				raw = column.source
			else:
				raw = pick_raw(column, row)
				if raw is None and column.role == FactorRole.METRIC:
					raise MaterializationError(
						f'Metric column [{column.source}] is missing from the metric query result.')
			item[column.columnName] = _cast_value(column.factorType, column.columnName, raw)
		mapped_rows.append(item)
	return mapped_rows
