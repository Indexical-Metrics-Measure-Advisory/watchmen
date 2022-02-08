from typing import Optional


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
