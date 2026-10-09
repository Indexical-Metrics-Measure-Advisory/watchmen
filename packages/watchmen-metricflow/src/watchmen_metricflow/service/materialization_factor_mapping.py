from datetime import date, datetime
from typing import Any, Dict, List, Optional, Sequence

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
TIME_GRAINS = ('day', 'week', 'month', 'quarter', 'year')


def build_default_factor_mapping(
		metric_name: str, time_grain: Any, group_by: Optional[Sequence[str]]
) -> List[FactorMappingColumn]:
	"""Default wide table layout: statDate + timeGrain + dimensions + metricValue."""
	grain = _grain_value(time_grain)
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


def _grain_value(time_grain: Any) -> str:
	# str enums are also str, so isinstance checks would keep the enum itself
	return TimeGrain(time_grain).value


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
	expected = f'{TIME_SOURCE_PREFIX}__{_grain_value(time_grain)}'
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


def _grain_of(time_column: Optional[str], time_grain: Any) -> str:
	"""Grain of the time column actually picked from the result, e.g. the
	metric_time__year column yields 'year' even when the request asked day."""
	if time_column is not None and str(time_column).startswith(f'{TIME_SOURCE_PREFIX}__'):
		suffix = str(time_column)[len(TIME_SOURCE_PREFIX) + 2:]
		if suffix in TIME_GRAINS:
			return suffix
	return _grain_value(time_grain)


def _parse_time_value(
		value: Any, time_grain: Any, time_column: Optional[str], column_name: str) -> date:
	"""Parse the time key of the metric query result into a date.

	The direct path renders time keys truncated to the group-by grain: day
	'2026-09-30', week '2026-40', month '2026-09', quarter '2026-Q4', year
	'2026', so plain fromisoformat is not enough. The key expands to the start
	of its period, which keeps statDate a stable business key under MERGE."""
	if isinstance(value, datetime):
		return value.date()
	if isinstance(value, date):
		return value
	text = str(value).strip()
	if text.endswith('.0') and text[:-2].isdigit():
		text = text[:-2]
	grain = _grain_of(time_column, time_grain)
	parsed = _try_grain_key(text, grain)
	if parsed is None:
		# tolerate a key whose format does not match the requested grain
		for fallback in ('day', 'month', 'quarter', 'week', 'year'):
			parsed = _try_grain_key(text, fallback)
			if parsed is not None:
				break
	if parsed is None:
		raise MaterializationError(
			f'Column [{column_name}] value [{value}] cannot be parsed as a date.')
	return parsed


def _try_grain_key(text: str, grain: str) -> Optional[date]:
	try:
		if grain == 'day':
			return date.fromisoformat(text[:10])
		if grain == 'week':
			year, _, week = text.partition('-')
			week = week[1:] if week[:1] in ('W', 'w') else week
			return datetime.strptime(f'{year}-W{int(week)}-1', '%G-W%V-%u').date()
		if grain == 'month':
			year, _, month = text.partition('-')
			return date(int(year), int(month), 1)
		if grain == 'quarter':
			year, _, quarter = text.partition('-Q')
			return date(int(year), (int(quarter) - 1) * 3 + 1, 1)
		# year
		return date(int(text[:4]), 1, 1)
	except (ValueError, IndexError):
		return None


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
				if column.factorType in DATE_FACTOR_TYPES:
					item[column.columnName] = _parse_time_value(
						raw, time_grain, time_column, column.columnName)
					continue
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
