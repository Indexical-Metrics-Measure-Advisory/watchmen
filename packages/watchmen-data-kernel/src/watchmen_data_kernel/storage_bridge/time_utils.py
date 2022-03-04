from datetime import datetime


def now() -> datetime:
	return datetime.now().replace(tzinfo=None)


def spent_ms(start: datetime, end: datetime = now()) -> int:
	"""
	diff in milliseconds from now
	"""
	return int((end - start).microseconds / 1000)
