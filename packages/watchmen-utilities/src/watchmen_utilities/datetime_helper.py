from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from json import JSONEncoder
from re import sub
from typing import Any, List, Optional, Tuple

from .array_helper import ArrayHelper


class DateTimeEncoder(JSONEncoder):
	def default(self, o):
		if isinstance(o, (datetime, date)):
			return o.isoformat()
		if isinstance(o, Decimal):
			return float(o)
		return super().default(o)


def get_current_time_in_seconds() -> datetime:
	return datetime.now().replace(tzinfo=None, microsecond=0)


def try_to_format_time(might_be_time: str, time_format: str) -> Tuple[bool, Optional[time]]:
	"""
	return a datetime object is parsed
	"""
	try:
		d = datetime.strptime(might_be_time, time_format)
		return True, d.time()
	except ValueError:
		return False, None


def is_time(value: Optional[str], formats: List[str]) -> Tuple[bool, Optional[time]]:
	"""
	none is not a date value, otherwise remove non-number characters and try to parse by given formats.
	digits after removing must match digits of format
	"""
	tidy_value = sub(r'\D', '', value)
	count = len(tidy_value)
	suitable_formats = ArrayHelper(formats).filter(lambda x: len(x) == count).to_list()
	for suitable_format in suitable_formats:
		parsed, date_value = try_to_format_time(tidy_value, suitable_format)
		if parsed:
			return parsed, date_value
	return False, None


def try_to_time(value: Any, formats: List[str]) -> Optional[time]:
	"""
	try to parse given value to date, or returns none when cannot be parsed.
	formats can be datetime and date format
	"""
	if value is None:
		return None
	elif isinstance(value, time):
		return value
	elif isinstance(value, str):
		parsed, date_value = is_time(value, formats)
		if parsed:
			return date_value
	return None


def try_to_format_date(might_be_date: str, date_format: str) -> Tuple[bool, Optional[date]]:
	"""
	return a datetime object is parsed
	"""
	try:
		d = datetime.strptime(might_be_date, date_format)
		return True, d
	except ValueError:
		return False, None


def is_date(value: Optional[str], formats: List[str]) -> Tuple[bool, Optional[date]]:
	"""
	none is not a date value, otherwise remove non-number characters and try to parse by given formats.
	digits after removing must match digits of format
	"""
	tidy_value = sub(r'\D', '', value)
	count = len(tidy_value)
	suitable_formats = ArrayHelper(formats).filter(lambda x: len(x) == count).to_list()
	for suitable_format in suitable_formats:
		parsed, date_value = try_to_format_date(tidy_value, suitable_format)
		if parsed:
			return parsed, date_value
	return False, None


def try_to_date(value: Any, formats: List[str], allow_timestamp: bool = False) -> Optional[date]:
	"""
	try to parse given value to date, or returns none when cannot be parsed.
	formats can be datetime and date format
	"""
	if value is None:
		return None
	elif isinstance(value, date):
		return value
	elif allow_timestamp and (isinstance(value, int) or isinstance(value, float)):
		# timestamp
		return datetime.fromtimestamp(value, tz=None)
	elif allow_timestamp and isinstance(value, Decimal):
		return datetime.fromtimestamp(float(value), tz=None)
	elif isinstance(value, str):
		parsed, date_value = is_date(value, formats)
		if parsed:
			return date_value
	return None


class DateTimeConstants(int, Enum):
	"""
	Week starts from Sunday
	"""
	HALF_YEAR_FIRST = 1
	HALF_YEAR_SECOND = 2

	QUARTER_FIRST = 1
	QUARTER_SECOND = 2
	QUARTER_THIRD = 3
	QUARTER_FOURTH = 4

	JANUARY = 1
	FEBRUARY = 2
	MARCH = 3
	APRIL = 4
	MAY = 5
	JUNE = 6
	JULY = 7
	AUGUST = 8
	SEPTEMBER = 9
	OCTOBER = 10
	NOVEMBER = 11
	DECEMBER = 12

	HALF_MONTH_FIRST = 1
	HALF_MONTH_SECOND = 2

	TEN_DAYS_FIRST = 1
	TEN_DAYS_SECOND = 2
	TEN_DAYS_THIRD = 3

	WEEK_OF_YEAR_FIRST_SHORT = 0  # first week less than 7 days, otherwise week of year starts from 1
	WEEK_OF_YEAR_FIRST = 1
	WEEK_OF_YEAR_LAST = 53

	WEEK_OF_MONTH_FIRST_SHORT = 0  # first week less than 7 days, otherwise week of month starts from 1
	WEEK_OF_MONTH_FIRST = 1
	WEEK_OF_MONTH_LAST = 5

	HALF_WEEK_FIRST = 1
	HALF_WEEK_SECOND = 2

	DAY_OF_MONTH_MIN = 1
	DAY_OF_MONTH_MAX = 31

	SUNDAY = 1
	MONDAY = 2
	TUESDAY = 3
	WEDNESDAY = 4
	THURSDAY = 5
	FRIDAY = 6
	SATURDAY = 7

	DAY_KIND_WORKDAY = 1
	DAY_KIND_WEEKEND = 2
	DAY_KIND_HOLIDAY = 3

	HOUR_KIND_WORKTIME = 1
	HOUR_KIND_OFF_HOURS = 2
	HOUR_KIND_SLEEPING_TIME = 3

	AM = 1
	PM = 2


def get_year(dt: date) -> int:
	return dt.year


def get_month(dt: date) -> int:
	return dt.month


def get_half_year(dt: date) -> int:
	return DateTimeConstants.HALF_YEAR_FIRST.value if get_month(dt) <= 6 else DateTimeConstants.HALF_YEAR_SECOND.value


def get_quarter(dt: date) -> int:
	month = get_month(dt)
	if month <= 3:
		return DateTimeConstants.QUARTER_FIRST.value
	elif month <= 6:
		return DateTimeConstants.QUARTER_SECOND.value
	elif month <= 9:
		return DateTimeConstants.QUARTER_THIRD.value
	else:
		return DateTimeConstants.QUARTER_FOURTH.value


def get_week_of_year(dt: date) -> int:
	return int(dt.strftime('%U'))


def get_week_of_month(dt: date) -> int:
	first_day = dt.replace(day=1)
	first_day_week = get_week_of_year(first_day)
	week_of_year = get_week_of_year(dt)
	if first_day_week == week_of_year:
		if get_day_of_week(first_day) == DateTimeConstants.SUNDAY.value:
			# first week is full week
			return DateTimeConstants.WEEK_OF_MONTH_FIRST
		else:
			# first week is short
			return DateTimeConstants.WEEK_OF_MONTH_FIRST_SHORT
	else:
		if get_day_of_week(first_day) == DateTimeConstants.SUNDAY.value:
			# first week is full week, must add 1
			return week_of_year - first_day_week + 1
		else:
			# first week is short
			return week_of_year - first_day_week


def get_day_of_month(dt: date) -> int:
	return dt.day


def get_day_of_week(dt: date) -> int:
	# iso weekday: Monday is 1 and Sunday is 7
	return (dt.isoweekday() + 1) % 8
