from typing import Any, Optional

from watchmen_utilities import is_decimal


def in_range(value: Any, min_value: Optional[int], max_value: Optional[int]) -> bool:
	parsed, v = is_decimal(value)
	if not parsed:
		return False

	if min_value is not None and v < min_value:
		return False
	if max_value is not None and v > max_value:
		return False

	return True
