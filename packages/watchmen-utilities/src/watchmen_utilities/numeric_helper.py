from decimal import Decimal
from typing import Any, Optional, Tuple


def is_numeric_instance(value: Any) -> bool:
	return value is not None and (isinstance(value, int) or isinstance(value, float) or isinstance(value, Decimal))


def is_decimal(value: Optional[str]) -> Tuple[bool, Optional[Decimal]]:
	"""
	none is not a numeric value, otherwise try to parse it by float function
	"""
	if value is None:
		return False, None
	try:

		return True, Decimal(value)
	except:
		return False, None


def try_to_decimal(value: Any) -> Optional[Decimal]:
	"""
	try to parse given value to decimal, or returns none when cannot be parsed
	"""
	if value is None:
		return None
	elif isinstance(value, int) or isinstance(value, float):
		return Decimal(value)
	elif isinstance(value, Decimal):
		return value
	elif isinstance(value, str):
		parsed, decimal_value = is_decimal(value)
		if parsed:
			return decimal_value
	return None
