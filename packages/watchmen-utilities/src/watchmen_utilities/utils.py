from decimal import Decimal
from typing import Any, Optional, Tuple


def is_blank(text: Optional[str]) -> bool:
	if text is None:
		return True
	if len(text) == 0:
		return True
	if len(text.strip()) == 0:
		return True
	return False


def is_not_blank(text: Optional[str]) -> bool:
	return not is_blank(text)


def is_numeric(value: str) -> Tuple[bool, Optional[Decimal]]:
	try:
		v = float(value)
		return True, Decimal(v)
	except ValueError:
		return False, None


def try_to_decimal(value: Any) -> Optional[Decimal]:
	"""
	try to parse given value to decimal, or returns none if cannot be parsed
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
