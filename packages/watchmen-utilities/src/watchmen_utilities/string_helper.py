from decimal import Decimal
from typing import Optional, Union


def is_blank(text: Optional[Union[str, int, float, Decimal]]) -> bool:
	if text is None:
		return True
	text = str(text)
	if len(text) == 0:
		return True
	if len(text.strip()) == 0:
		return True
	return False


def is_not_blank(text: Optional[str]) -> bool:
	return not is_blank(text)
