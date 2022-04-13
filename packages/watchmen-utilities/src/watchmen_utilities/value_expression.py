from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, List, Optional, Tuple, Union

from .datetime_helper import is_date, is_time, truncate_time
from .numeric_helper import is_decimal


def is_empty(value: Any) -> bool:
	"""
	empty means given value is one of none, zero length string, empty list, empty dict
	"""
	if value is None:
		return True
	elif isinstance(value, str):
		return len(value) == 0
	elif isinstance(value, list):
		return len(value) == 0
	elif isinstance(value, dict):
		return len(value) == 0
	else:
		return False


def is_not_empty(value: Any) -> bool:
	return not is_empty(value)


def equals_decimal(value: Union[int, float, Decimal], another: Any) -> bool:
	if isinstance(value, int) or isinstance(value, float):
		value = Decimal(value)

	if isinstance(another, Decimal):
		return value == another
	elif isinstance(another, int) or isinstance(another, float):
		return value == Decimal(another)
	elif isinstance(another, str):
		parsed, another_value = is_decimal(another)
		return parsed and value == another_value
	else:
		return False


def equals_time(value: time, another: Any, formats: List[str]) -> bool:
	"""
	microsecond is ignored
	"""
	if isinstance(another, time):
		return value.replace(microsecond=0) == another.replace(microsecond=0)
	elif isinstance(another, str):
		parsed, another_value = is_time(another, formats)
		return parsed and value.replace(microsecond=0) == another_value.replace(microsecond=0)
	else:
		return False


def equals_date(value: date, another: Any, formats: List[str]) -> bool:
	"""
	hour, minute, second, microsecond and timezone are ignored
	"""
	value = truncate_time(value)
	if isinstance(another, datetime):
		return value == truncate_time(another)
	if isinstance(another, date):
		return value == truncate_time(another)
	elif isinstance(another, str):
		parsed, another_value = is_date(another, formats)
		if not parsed or another_value is None:
			return False
		else:
			return value == truncate_time(another_value)
	else:
		return False


def equals_bool(value: bool, another: Any) -> bool:
	if isinstance(another, bool):
		return value == another
	elif isinstance(another, (int, float, Decimal)):
		if value:
			return another == 1
		else:
			return another == 0
	elif isinstance(another, str):
		if value:
			return another.lower() in ['1', 't', 'true', 'y', 'yes']
		else:
			return another.lower() in ['0', 'f', 'false', 'n', 'no']
	else:
		return False


def value_equals(
		one: Any, another: Any,
		time_formats: List[str], date_formats: List[str]) -> bool:
	if one is None or (isinstance(one, str) and one == ''):
		# empty string is none
		return another is None or (isinstance(another, str) and another == '')
	elif another is None or (isinstance(another, str) and another == ''):
		return False
	elif isinstance(one, bool):
		return equals_bool(one, another)
	elif isinstance(another, bool):
		return equals_bool(another, one)
	elif isinstance(one, int) or isinstance(one, float) or isinstance(one, Decimal):
		# compare numeric
		return equals_decimal(Decimal(one), another)
	elif isinstance(another, int) or isinstance(another, float) or isinstance(another, Decimal):
		# compare numeric
		return equals_decimal(Decimal(another), one)
	elif isinstance(one, time):
		# compare time
		return equals_time(one, another, time_formats)
	elif isinstance(another, time):
		# compare time
		return equals_time(another, one, time_formats)
	elif isinstance(one, datetime) or isinstance(one, date):
		# compare datetime or date
		return equals_date(one, another, date_formats)
	elif isinstance(another, datetime) or isinstance(another, date):
		# compare datetime or date
		return equals_date(another, one, date_formats)
	elif isinstance(one, str):
		# compare string
		if isinstance(another, int) or isinstance(another, float) or isinstance(another, Decimal):
			return one == str(another)
		elif isinstance(another, str):
			return one == another
		else:
			return False
	else:
		# any other type is not comparable
		return False


def value_not_equals(
		one: Any, another: Any,
		time_formats: List[str], date_formats: List[str]) -> bool:
	return not value_equals(one, another, time_formats, date_formats)


def less_or_equals_decimal(
		value: Union[int, float, Decimal], another: Any, allow_equals: bool
) -> Tuple[bool, Optional[bool]]:
	"""
	return a tuple which first is can be compared.
	second is comparison result when first is true, otherwise second is none.
	"""
	if isinstance(value, int) or isinstance(value, float):
		value = Decimal(value)

	if isinstance(another, Decimal):
		return True, value <= another if allow_equals else value < another
	elif isinstance(another, int) or isinstance(another, float):
		return True, value <= Decimal(another) if allow_equals else value < Decimal(another)
	elif isinstance(another, str):
		parsed, another_value = is_decimal(another)
		if parsed:
			return True, value <= another_value if allow_equals else value < another_value
		else:
			return False, None
	else:
		return False, None


def greater_or_equals_decimal(
		value: Union[int, float, Decimal], another: Any, allow_equals: bool
) -> Tuple[bool, Optional[bool]]:
	"""
	return a tuple which first is can be compared.
	second is comparison result when first is true, otherwise second is none.
	"""
	if isinstance(value, int) or isinstance(value, float):
		value = Decimal(value)

	if isinstance(another, Decimal):
		return True, value >= another if allow_equals else value > another
	elif isinstance(another, int) or isinstance(another, float):
		return True, value >= Decimal(another) if allow_equals else value > Decimal(another)
	elif isinstance(another, str):
		parsed, another_value = is_decimal(another)
		if parsed:
			return True, value >= another_value if allow_equals else value > another_value
		else:
			return False, None
	else:
		return False, None


def less_or_equals_time(
		value: time, another: Any, formats: List[str], allow_equals: bool
) -> Tuple[bool, Optional[bool]]:
	"""
	return a tuple which first is can be compared.
	second is comparison result when first is true, otherwise second is none.
	"""
	if isinstance(another, time):
		return True, value.replace(microsecond=0) <= another.replace(microsecond=0) \
			if allow_equals else value.replace(microsecond=0) < another.replace(microsecond=0)
	elif isinstance(another, str):
		parsed, another_value = is_time(another, formats)
		if parsed:
			return True, value.replace(microsecond=0) <= another_value.replace(microsecond=0) \
				if allow_equals else value.replace(microsecond=0) < another_value.replace(microsecond=0)
		else:
			return False, None
	else:
		return False, None


def greater_or_equals_time(
		value: time, another: Any, formats: List[str], allow_equals: bool
) -> Tuple[bool, Optional[bool]]:
	"""
	return a tuple which first is can be compared.
	second is comparison result when first is true, otherwise second is none.
	"""
	if isinstance(another, time):
		return True, value.replace(microsecond=0) >= another.replace(microsecond=0) \
			if allow_equals else value.replace(microsecond=0) > another.replace(microsecond=0)
	elif isinstance(another, str):
		parsed, another_value = is_time(another, formats)
		if parsed:
			return True, value.replace(microsecond=0) >= another_value.replace(microsecond=0) \
				if allow_equals else value.replace(microsecond=0) > another_value.replace(microsecond=0)
		else:
			return False, None
	else:
		return False, None


def less_or_equals_date(
		value: date, another: Any, formats: List[str], allow_equals: bool
) -> Tuple[bool, Optional[bool]]:
	"""
	return a tuple which first is can be compared.
	second is comparison result when first is true, otherwise second is none.
	"""
	value = truncate_time(value)
	if isinstance(another, datetime):
		return True, value <= truncate_time(another) \
			if allow_equals else value < truncate_time(another)
	elif isinstance(another, str):
		parsed, another_value = is_date(another, formats)
		if parsed:
			return True, value <= truncate_time(another_value) if allow_equals else value < truncate_time(another_value)
		else:
			return False, None
	else:
		return False, None


def greater_or_equals_date(
		value: date, another: Any, formats: List[str], allow_equals: bool
) -> Tuple[bool, Optional[bool]]:
	"""
	return a tuple which first is can be compared.
	second is comparison result when first is true, otherwise second is none.
	"""
	value = truncate_time(value)
	if isinstance(another, datetime):
		return True, value >= truncate_time(another) \
			if allow_equals else value > truncate_time(another)
	elif isinstance(another, str):
		parsed, another_value = is_date(another, formats)
		if parsed:
			return True, value >= truncate_time(another_value) if allow_equals else value > truncate_time(another_value)
		else:
			return False, None
	else:
		return False, None
