from datetime import datetime


def now() -> datetime:
	return datetime.now().replace(tzinfo=None)


def spent_ms(start: datetime, end: datetime = None) -> int:
	"""
	diff in milliseconds from now
	"""
	if end is None:
		end = now()
	return int((end - start).seconds * 1000 + (end - start).microseconds / 1000)
