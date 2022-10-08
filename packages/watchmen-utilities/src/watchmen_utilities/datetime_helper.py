from datetime import date, datetime, time, timedelta
from decimal import Decimal
from enum import Enum
from json import JSONEncoder
from re import sub
from typing import Any, List, Optional, Tuple, Union

from .array_helper import ArrayHelper
from .numeric_helper import is_decimal


class DateTimeEncoder(JSONEncoder):
	def default(self, o):
		if isinstance(o, (datetime, date, time)):
			return o.isoformat()
		if isinstance(o, Decimal):
			if o == o.to_integral_value():
				# integral
				if o > 999999999999999 or o < -999999999999999:
					return f'{int(o)}'
				else:
					return int(o)
			elif o > 999999999999999 or o < -999999999999999:
				return f'{o}'
			else:
				return float(o)
		return super().default(o)


def get_current_time_in_seconds() -> datetime:
	return datetime.now().replace(tzinfo=None, microsecond=0)


def is_date_or_time_instance(value: Any) -> bool:
	return value is not None and (isinstance(value, date) or isinstance(value, time) or isinstance(value, datetime))


def truncate_time(value: Union[date, datetime]) -> datetime:
	if isinstance(value, datetime):
		return value.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
	else:
		return datetime(year=value.year, month=value.month, day=value.day) \
			.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)


def last_day_of_month(a_date: date) -> int:
	return ((a_date.replace(day=1) + timedelta(days=31)).replace(day=1) - timedelta(days=1)).day


def year_diff(end_date: date, start_date: date) -> int:
	end_year = end_date.year
	end_month = end_date.month
	end_day = end_date.day
	start_year = start_date.year
	start_month = start_date.month
	start_day = start_date.day
	if end_year == start_year:
		# same year, always return 0
		return 0
	elif end_year > start_year:
		if end_month == start_month:
			if end_day >= start_day:
				return end_year - start_year
			elif end_month == 2:
				last_day_of_end_month = last_day_of_month(end_date)
				if end_day == last_day_of_end_month and start_day >= end_day:
					return end_year - start_year
				else:
					return end_year - start_year - 1
			else:
				return end_year - start_year - 1
		elif end_month > start_month:
			return end_year - start_year
		else:
			return end_year - start_year - 1
	else:
		if end_month == start_month:
			if end_day > start_day:
				if end_month == 2:
					last_day_of_start_month = last_day_of_month(start_date)
					if start_day == last_day_of_start_month:
						return end_year - start_year
					else:
						return end_year - start_year + 1
				else:
					return end_year - start_year + 1
			else:
				return end_year - start_year
		elif end_month > start_month:
			return end_year - start_year + 1
		else:
			return end_year - start_year


def month_diff(end_date: date, start_date: date) -> int:
	end_year = end_date.year
	end_month = end_date.month
	end_day = end_date.day
	start_year = start_date.year
	start_month = start_date.month
	start_day = start_date.day
	if end_year == start_year:
		if end_month == start_month:
			# same year, same month, always return 0
			return 0
		if end_month > start_month:
			if end_day >= start_day:
				return end_month - start_month
			else:
				last_day_of_end_month = last_day_of_month(end_date)
				if last_day_of_end_month == end_day and start_day >= end_day:
					# it is last day of end month
					return end_month - start_month
				else:
					return end_month - start_month - 1
		else:
			# end date is before start date
			if end_day > start_day:
				last_day_of_start_month = last_day_of_month(start_date)
				if last_day_of_start_month == start_day and end_day >= start_day:
					# it is last day of start month
					return end_month - start_month
				else:
					return end_month - start_month + 1
			else:
				return end_month - start_month
	elif end_year > start_year:
		if end_day >= start_day:
			return (end_year - start_year) * 12 + end_month - start_month
		else:
			last_day_of_end_month = last_day_of_month(end_date)
			if last_day_of_end_month == end_day and start_day >= end_day:
				return (end_year - start_year) * 12 + end_month - start_month
			else:
				return (end_year - start_year) * 12 + end_month - start_month + 1
	else:
		# end year is before start year
		if end_day > start_day:
			last_day_of_start_month = last_day_of_month(start_date)
			if last_day_of_start_month == start_day and end_day >= start_day:
				# it is last day of start month
				return (end_year - start_year + 1) * 12 + 12 - end_month + start_month
			else:
				return (end_year - start_year + 1) * 12 + 12 - end_month + start_month - 1
		else:
			return (end_year - start_year + 1) * 12 + 12 - end_month + start_month


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
	none is not a time value, otherwise remove non-number characters and try to parse by given formats.
	digits after removing must match digits of format
	"""
	if value is None:
		return False, None
	tidy_value = sub(r'[^0-9+]', '', value)
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


def is_suitable_format(value_length: int, a_format: str) -> bool:
	plus_year = '%Y' in a_format
	plus_timezone = '%z' in a_format
	plus_digits = (2 if plus_year else 0) + (3 if plus_timezone else 0)
	if value_length > 14 and not plus_timezone:
		return '%f' in a_format
	elif value_length > 14 and plus_timezone:
		if value_length > 19:
			return '%f' in a_format and plus_timezone
		else:
			return value_length == len(a_format) + plus_digits
	else:
		return value_length == len(a_format) + plus_digits


def is_date_plus_format(value: Optional[str], formats: List[str]) -> Tuple[bool, Optional[date], Optional[str]]:
	"""
	none is not a date value, otherwise remove non-number characters and try to parse by given formats.
	digits after removing must match digits of format.
	return format itself when parsed
	"""
	if value is None:
		return False, None, None

	tidy_value = sub(r'[^0-9+]', '', value)
	count = len(tidy_value)
	# format cannot use length to match
	suitable_formats = ArrayHelper(formats).filter(lambda x: is_suitable_format(count, x)).to_list()
	for suitable_format in suitable_formats:
		parsed, date_value = try_to_format_date(tidy_value, suitable_format)
		if parsed:
			return parsed, date_value, suitable_format
	return False, None, None


def is_date(value: Optional[str], formats: List[str]) -> Tuple[bool, Optional[date]]:
	parsed, date_value, _ = is_date_plus_format(value, formats)
	return parsed, date_value


def is_datetime(value: Optional[str], formats: List[str]) -> Tuple[bool, Optional[datetime]]:
	parsed, date_value = is_date(value, formats)
	if not parsed:
		return False, None
	elif isinstance(date_value, datetime):
		return True, date_value
	else:
		return True, datetime(
			year=date_value.year, month=date_value.month, day=date_value.day,
			hour=0, minute=0, second=0, microsecond=0)


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


DATE_FORMAT_MAPPING = {
	'Y': '%Y',  # 4 digits year
	'y': '%y',  # 2 digits year
	'M': '%m',  # 2 digits month
	'D': '%d',  # 2 digits day of month
	'h': '%H',  # 2 digits hour, 00 - 23
	'H': '%I',  # 2 digits hour, 01 - 12
	'm': '%M',  # 2 digits minute
	's': '%S',  # 2 digits second
	'W': '%A',  # Monday - Sunday
	'w': '%a',  # Mon - Sun
	'B': '%B',  # January - December
	'b': '%b',  # Jan - Dec
	'p': '%p'  # AM/PM
}


def translate_date_format_to_memory(date_format: str) -> str:
	return ArrayHelper(list(DATE_FORMAT_MAPPING)) \
		.reduce(lambda original, x: original.replace(x, DATE_FORMAT_MAPPING[x]), date_format)


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


def to_start_of_day(process_date: date):
	if isinstance(process_date, datetime):
		return process_date.date()
	else:
		return process_date


def to_yesterday(process_date: date) -> date:
	"""
	return yesterday
	"""
	return to_start_of_day(process_date - timedelta(days=1))


def to_previous_week(process_date: date) -> date:
	"""
	return first day of previous week, sunday
	"""
	# iso weekday: Monday is 1 and Sunday is 7
	weekday = process_date.isoweekday()
	# get last sunday
	return to_start_of_day(process_date - timedelta(days=weekday % 7 + 7))


def to_previous_month(process_date: date) -> date:
	"""
	return first day of previous month
	"""
	# get last day of previous month
	process_date = process_date.replace(day=1) - timedelta(days=1)
	# set to first day of previous month
	return to_start_of_day(process_date.replace(day=1))


def try_to_move_date(a_date: date, to_year: int, to_month: int, to_day_of_month: int) -> date:
	last_day = last_day_of_month(a_date.replace(year=to_year, month=to_month, day=1))
	if to_day_of_month > last_day:
		to_day_of_month = last_day
	return a_date.replace(year=to_year, month=to_month, day=to_day_of_month)


def move_year(a_date: date, move_type: str, value: int) -> date:
	if move_type == '':
		return try_to_move_date(a_date, value, a_date.month, a_date.day)
	elif move_type == '+':
		return try_to_move_date(a_date, a_date.year + value, a_date.month, a_date.day)
	elif move_type == '-':
		return try_to_move_date(a_date, a_date.year - value, a_date.month, a_date.day)
	else:
		raise ValueError(f'Date move command type[{move_type}] is not supported.')


def move_month(a_date: date, move_type: str, value: int) -> date:
	if move_type == '':
		if value > 12:
			value = 12
		elif value < 1:
			value = 1
		return try_to_move_date(a_date, a_date.year, value, a_date.day)
	elif move_type == '+':
		year = int(value / 12)
		month = value % 12
		if month + a_date.month > 12:
			return try_to_move_date(a_date, a_date.year + year + 1, a_date.month + month - 12, a_date.day)
		else:
			return try_to_move_date(a_date, a_date.year + year, a_date.month + month, a_date.day)
	elif move_type == '-':
		year = int(value / 12)
		month = value % 12
		if a_date.month - month < 1:
			return try_to_move_date(a_date, a_date.year - year - 1, a_date.month - month + 12, a_date.day)
		else:
			return try_to_move_date(a_date, a_date.year - year, a_date.month - month, a_date.day)
	else:
		raise ValueError(f'Date move command type[{move_type}] is not supported.')


def move_day_of_month(a_date: date, move_type: str, value: int) -> date:
	if value == 99:
		month = a_date.month
		if month == 1 or month == 3 or month == 5 or month == 7 or month == 8 or month == 10 or month == 12:
			return a_date.replace(day=31)
		elif month == 4 or month == 6 or month == 9 or month == 1:
			return a_date.replace(day=30)
		else:
			return try_to_move_date(a_date, a_date.year, a_date.month, 29)
	if move_type == '':
		if value < 1:
			value = 1
		return try_to_move_date(a_date, a_date.year, a_date.month, value)
	elif move_type == '+':
		return a_date + timedelta(days=value)
	elif move_type == '-':
		return a_date - timedelta(days=value)
	else:
		raise ValueError(f'Date move command type[{move_type}] is not supported.')


def move_hour(a_time: Union[time, datetime], move_type: str, value: int) -> Union[time, datetime]:
	if move_type == '':
		if value < 0:
			value = 0
		elif value > 23:
			value = 23
		return a_time.replace(hour=value)
	elif move_type == '+':
		if isinstance(a_time, datetime):
			return a_time + timedelta(hours=value)
		else:
			return a_time.replace(hour=(a_time.hour + value) % 24)
	elif move_type == '-':
		if isinstance(a_time, datetime):
			return a_time - timedelta(hours=value)
		else:
			# to avoid negative value
			return a_time.replace(hour=(a_time.hour - (value % 24) + 24) % 24)
	else:
		raise ValueError(f'Date move command type[{move_type}] is not supported.')


def move_minute(a_time: Union[time, datetime], move_type: str, value: int) -> Union[time, datetime]:
	if move_type == '':
		if value < 0:
			value = 0
		elif value > 59:
			value = 59
		return a_time.replace(minute=value)
	elif move_type == '+':
		if isinstance(a_time, datetime):
			return a_time + timedelta(minutes=value)
		else:
			hour = int(value / 60)
			minute = value % 60
			if a_time.minute + minute >= 60:
				return a_time.replace(hour=(a_time.hour + hour + 1) % 24, minute=a_time.minute + minute - 60)
			else:
				return a_time.replace(hour=(a_time.hour + hour) % 24, minute=a_time.minute + minute)
	elif move_type == '-':
		if isinstance(a_time, datetime):
			return a_time - timedelta(minutes=value)
		else:
			hour = int(value / 60)
			minute = value % 60
			if a_time.minute - minute < 0:
				return a_time.replace(hour=(a_time.hour - hour % 24 - 1 + 24) % 24, minute=a_time.minute - minute + 60)
			else:
				return a_time.replace(hour=(a_time.hour - hour % 24 + 24) % 24, minute=a_time.minute - minute)
	else:
		raise ValueError(f'Date move command type[{move_type}] is not supported.')


def move_second(a_time: Union[time, datetime], move_type: str, value: int) -> Union[time, datetime]:
	if move_type == '':
		if value < 0:
			value = 0
		elif value > 59:
			value = 59
		return a_time.replace(second=value)
	elif move_type == '+':
		if isinstance(a_time, datetime):
			return a_time + timedelta(seconds=value)
		else:
			hour = int(value / 3600)
			minute = int((value % 3600) / 60)
			second = value % 60
			if a_time.second + second >= 60:
				second = second - 60
				minute = minute + 1
			if a_time.minute + minute >= 60:
				minute = minute - 60
				hour = hour + 1
			return a_time.replace(
				hour=(a_time.hour + hour) % 24,
				minute=a_time.minute + minute,
				second=a_time.second + second
			)
	elif move_type == '-':
		if isinstance(a_time, datetime):
			return a_time - timedelta(seconds=value)
		else:
			hour = int(value / 3600)
			minute = int((value % 3600) / 60)
			second = value % 60
			if a_time.second - second < 0:
				second = second - 60
				minute = minute + 1
			if a_time.minute - minute < 0:
				minute = minute - 60
				hour = hour + 1
			return a_time.replace(
				hour=(a_time.hour - hour + 24) % 24,
				minute=a_time.minute - minute,
				second=a_time.second - second
			)
	else:
		raise ValueError(f'Date move command type[{move_type}] is not supported.')


def move_date_or_time(date_or_time: Union[date, time], movement: Tuple[str, str, str]) -> Union[date, time]:
	value_parsed, value = is_decimal(movement[2])
	if not value_parsed:
		raise ValueError(f'Date move command[{movement}] is not supported.')
	value = int(value)

	location = movement[0]
	if location == 'Y':
		return move_year(date_or_time, movement[1], value) if isinstance(date_or_time, date) else date_or_time
	elif location == 'M':
		return move_month(date_or_time, movement[1], value) if isinstance(date_or_time, date) else date_or_time
	elif location == 'D':
		return move_day_of_month(date_or_time, movement[1], value) if isinstance(date_or_time, date) else date_or_time
	elif location == 'h':
		if isinstance(date_or_time, time) or isinstance(date_or_time, datetime):
			return move_hour(date_or_time, movement[1], value)
		else:
			return date_or_time
	elif location == 'm':
		if isinstance(date_or_time, time) or isinstance(date_or_time, datetime):
			return move_minute(date_or_time, movement[1], value)
		else:
			return date_or_time
	elif location == 's':
		if isinstance(date_or_time, time) or isinstance(date_or_time, datetime):
			return move_second(date_or_time, movement[1], value)
		else:
			return date_or_time
	else:
		raise ValueError(f'Date move command[{movement}] is not supported.')


def move_date(a_date: date, movements: List[Tuple[str, str, str]]) -> date:
	return ArrayHelper(movements).reduce(lambda base_date, x: move_date_or_time(base_date, x), a_date)


def date_might_with_prefix(prefix: Optional[str], a_date_or_time: Union[date, time]) -> Union[date, time, str]:
	if isinstance(a_date_or_time, datetime):
		return a_date_or_time if len(prefix) == 0 else f'{prefix}{a_date_or_time.strftime("%Y-%m-%d %H:%M:%S")}'
	elif isinstance(a_date_or_time, date):
		return a_date_or_time if len(prefix) == 0 else f'{prefix}{a_date_or_time.strftime("%Y-%m-%d")}'
	elif isinstance(a_date_or_time, time):
		return a_date_or_time if len(prefix) == 0 else f'{prefix}{a_date_or_time.strftime("%H:%M:%S")}'
	else:
		return a_date_or_time if len(prefix) == 0 else f'{prefix}{a_date_or_time}'
