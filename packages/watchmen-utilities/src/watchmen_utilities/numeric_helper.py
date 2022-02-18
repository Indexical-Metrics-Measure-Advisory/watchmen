from decimal import Decimal
from typing import Any, Optional, Tuple


def is_numeric(value: Optional[str]) -> Tuple[bool, Optional[Decimal]]:
	"""
	none is not a numeric value, otherwise try to parse it by float function
	"""
	if value is None:
		return False, None
	try:
		v = float(value)
		return True, Decimal(v)
	except ValueError:
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
		parsed, decimal_value = is_numeric(value)
		if parsed:
			return decimal_value
	return None
