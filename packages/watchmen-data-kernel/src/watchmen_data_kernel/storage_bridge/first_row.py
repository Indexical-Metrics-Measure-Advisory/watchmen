from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.common import VariablePredefineFunctions
from watchmen_utilities import is_blank
from .min_max import convert_str_to_date, convert_str_to_datetime, convert_str_to_decimal

"""
Pick the first row from a list of dict after sorting by given key(s).
Format: &firstRow(fieldPath:asc|desc, ...), direction is optional, asc as default.
Field path supports nested, e.g. &firstRow(address.city:desc).
Value of none is always sorted to the tail, no matter which direction is declared.
Returns none when list is empty, element is not a dict, or value is not a list.
Type detection of sort value reuses the conversion logic of min/max functions,
string values are converted in the priority order of decimal > datetime > date,
and a string which cannot be converted is compared as-is.
Date value is normalized to datetime (at midnight) to keep comparable with datetime,
same as min/max functions do when datetime and date are mixed.
"""

FIRST_ROW_FUNC = VariablePredefineFunctions.FIRST_ROW.value


def is_first_row_function(current_name: str) -> bool:
	return current_name == FIRST_ROW_FUNC or current_name.startswith(f'{FIRST_ROW_FUNC}(')


def to_comparable_value(value: Any) -> Any:
	if value is None:
		return None
	elif isinstance(value, int) and not isinstance(value, bool):
		return Decimal(value)
	elif isinstance(value, float):
		return Decimal(str(value))
	elif isinstance(value, Decimal):
		return value
	elif isinstance(value, datetime):
		return value
	elif isinstance(value, date):
		# normalize to datetime, keep comparable with datetime values
		return datetime.combine(value, time.min)
	elif isinstance(value, str):
		if is_blank(value):
			# treat blank string as none
			return None
		is_decimal_, decimal_result = convert_str_to_decimal(value)
		if is_decimal_:
			return decimal_result
		is_datetime_, datetime_result = convert_str_to_datetime(value)
		if is_datetime_:
			return datetime_result
		is_date_, date_result = convert_str_to_date(value)
		if is_date_:
			return datetime.combine(date_result, time.min)
		# cannot be converted, compare as-is
		return value
	else:
		raise DataKernelException(f'Invalid value[{value}] for first row function.')


def extract_value(row: Dict[str, Any], path: str) -> Any:
	value: Any = row
	for segment in path.split('.'):
		if not isinstance(value, dict):
			return None
		value = value.get(segment)
		if value is None:
			return None
	return value


def parse_sort_keys(name: str, current_name: str, data: Any) -> List[Tuple[str, bool]]:
	"""
	Parse sort keys from function segment, returns list of (field path, is descending).
	"""
	length = len(FIRST_ROW_FUNC)
	if len(current_name) < length + 3 \
			or not current_name.startswith(f'{FIRST_ROW_FUNC}(') or not current_name.endswith(')'):
		raise DataKernelException(
			f'First row function must be declared as {FIRST_ROW_FUNC}(field:asc|desc, ...), '
			f'current is [key={name}, current={current_name}].')
	params_str = current_name[length + 1:-1]
	if is_blank(params_str):
		raise DataKernelException(
			f'Sort key not declared on first row function[key={name}, current={current_name}] from [{data}].')

	sort_keys: List[Tuple[str, bool]] = []
	for param in params_str.split(','):
		param = param.strip()
		if is_blank(param):
			raise DataKernelException(
				f'Blank sort key declared on first row function[key={name}, current={current_name}] from [{data}].')
		path, _, direction = param.rpartition(':')
		if len(path) == 0:
			# no direction declared, asc as default
			path, desc = direction.strip(), False
		else:
			path = path.strip()
			direction = direction.strip().lower()
			if direction == 'asc':
				desc = False
			elif direction == 'desc':
				desc = True
			else:
				raise DataKernelException(
					f'Direction[{direction}] of sort key is not supported on '
					f'first row function[key={name}, current={current_name}] from [{data}].')
		if is_blank(path):
			raise DataKernelException(
				f'Blank sort key declared on first row function[key={name}, current={current_name}] from [{data}].')
		sort_keys.append((path, desc))
	return sort_keys


def sort_by_key(name: str, current_name: str, data: Any, rows: List[Dict[str, Any]], path: str, desc: bool) \
		-> List[Dict[str, Any]]:
	# rows with none value are always sorted to the tail
	with_value: List[Tuple[Any, Dict[str, Any]]] = []
	without_value: List[Dict[str, Any]] = []
	for row in rows:
		value = to_comparable_value(extract_value(row, path))
		if value is None:
			without_value.append(row)
		else:
			with_value.append((value, row))
	try:
		# stable sort, keeps original order on equal values
		with_value.sort(key=lambda x: x[0], reverse=desc)
	except TypeError:
		raise DataKernelException(
			f'Type mismatch on first row function[key={name}, current={current_name}] from [{data}].')
	return [row for _, row in with_value] + without_value


def first_row_value(name: str, current_name: str, data: Any) -> Optional[Dict[str, Any]]:
	if not isinstance(data, list):
		return None
	if len(data) == 0:
		return None
	sort_keys = parse_sort_keys(name, current_name, data)
	for row in data:
		if not isinstance(row, dict):
			return None
	rows = list(data)
	# sort from the last key to the first, rely on stability of sorted
	for path, desc in reversed(sort_keys):
		rows = sort_by_key(name, current_name, data, rows, path, desc)
	return rows[0]
