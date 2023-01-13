from datetime import date, datetime, timedelta
from typing import Optional, Tuple, Union

from watchmen_data_kernel.common import ask_date_formats
from watchmen_model.indicator import ObjectiveTimeFrame, ObjectiveTimeFrameKind, ObjectiveTimeFrameTill
from watchmen_utilities import get_current_time_in_seconds, is_blank, is_date, is_decimal, last_day_of_month, \
	move_month, move_year, to_last_day_of_month


class TimeFrame:
	def __init__(self, start: datetime, end: datetime):
		self.start = start
		self.end = end


def as_time_frame(duration: Optional[Tuple[datetime, datetime]]) -> Optional[TimeFrame]:
	if duration is None:
		return None
	else:
		return TimeFrame(start=duration[0], end=duration[1])


def compute_last_day(timeFrame: ObjectiveTimeFrame) -> datetime:
	if timeFrame.till == ObjectiveTimeFrameTill.LAST_COMPLETE_CYCLE:
		now_time = get_current_time_in_seconds()
		if timeFrame.kind == ObjectiveTimeFrameKind.YEAR or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_YEARS:
			# 12/31, last year
			return now_time.replace(year=now_time.year - 1, month=12, day=31)
		if timeFrame.kind == ObjectiveTimeFrameKind.HALF_YEAR:
			month = now_time.month
			if month <= 6:
				# 12/31, last year
				return now_time.replace(year=now_time.year - 1, month=12, day=31)
			else:
				# 6/30, this year
				return now_time.replace(month=6, day=30)
		elif timeFrame.kind == ObjectiveTimeFrameKind.QUARTER:
			month = now_time.month
			if month <= 3:
				# 12/31, last year
				return now_time.replace(year=now_time.year - 1, month=12, day=31)
			elif month <= 6:
				# 3/31, this year
				return now_time.replace(month=3, day=31)
			elif month <= 9:
				# 6/30, this year
				return now_time.replace(month=6, day=30)
			else:
				# 9/30, this year
				return now_time.replace(month=9, day=30)
		elif timeFrame.kind == ObjectiveTimeFrameKind.MONTH \
				or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_MONTHS:
			# last day of last month
			return now_time.replace(day=1) - timedelta(days=1)
		elif timeFrame.kind == ObjectiveTimeFrameKind.WEEK_OF_YEAR \
				or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_WEEKS:
			# last saturday
			weekday = now_time.weekday()
			# week is sun - sat, weekday is mon: 0 - sun: 6
			if weekday == 6:
				# sunday, which means last sat is yesterday
				return now_time - timedelta(days=1)
			else:
				# mon - sat, subtract days
				return now_time - timedelta(weekday + 2)
		elif timeFrame.kind == ObjectiveTimeFrameKind.DAY_OF_MONTH \
				or timeFrame.kind == ObjectiveTimeFrameKind.DAY_OF_WEEK \
				or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_DAYS:
			return now_time - timedelta(days=1)
		elif timeFrame.kind == ObjectiveTimeFrameKind.NONE:
			return now_time
		else:
			return now_time
	elif timeFrame.till == ObjectiveTimeFrameTill.SPECIFIED:
		value = timeFrame.specifiedTill
		if is_blank(value):
			return get_current_time_in_seconds()
		parsed, parsed_date = is_date(value, ask_date_formats())
		if parsed:
			return datetime.combine(parsed_date, get_current_time_in_seconds().time())
		else:
			return get_current_time_in_seconds()
	else:
		now_time = get_current_time_in_seconds()
		if timeFrame.kind == ObjectiveTimeFrameKind.YEAR or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_YEARS:
			# 12/31, this year
			return now_time.replace(month=12, day=31)
		elif timeFrame.kind == ObjectiveTimeFrameKind.HALF_YEAR:
			month = now_time.month
			if month <= 6:
				# 6/30, this year
				return now_time.replace(month=6, day=30)
			else:
				# 12/31, this year
				return now_time.replace(month=12, day=31)
		elif timeFrame.kind == ObjectiveTimeFrameKind.QUARTER:
			month = now_time.month
			if month <= 3:
				# 3/31, this year
				return now_time.replace(month=3, day=31)
			elif month <= 6:
				# 6/30, this year
				return now_time.replace(month=6, day=30)
			elif month <= 9:
				# 9/30, this year
				return now_time.replace(month=9, day=30)
			else:
				# 12/31, this year
				return now_time.replace(month=12, day=31)
		elif timeFrame.kind == ObjectiveTimeFrameKind.MONTH or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_MONTHS:
			# last day of this month
			return datetime.combine(to_last_day_of_month(now_time), get_current_time_in_seconds().time())
		elif timeFrame.kind == ObjectiveTimeFrameKind.WEEK_OF_YEAR or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_WEEKS:
			# this saturday
			weekday = now_time.weekday()
			# week is sun - sat, weekday is mon: 0 - sun: 6
			if weekday == 6:
				# sunday, add 6 days
				return now_time + timedelta(days=6)
			else:
				# mon - sat, add days
				return now_time + timedelta(days=5 - weekday)
		elif timeFrame.kind == ObjectiveTimeFrameKind.DAY_OF_MONTH \
				or timeFrame.kind == ObjectiveTimeFrameKind.DAY_OF_WEEK \
				or timeFrame.kind == ObjectiveTimeFrameKind.LAST_N_DAYS \
				or timeFrame.kind == ObjectiveTimeFrameKind.NONE:
			return now_time
		else:
			return now_time


def compute_last_n(time_frame: ObjectiveTimeFrame) -> int:
	if is_blank(time_frame.lastN):
		return 1

	parsed, value = is_decimal(time_frame.lastN)
	if not parsed:
		return 1
	else:
		value = int(value)
		return 1 if value < 1 else value


def add_time_part(
		frame: Optional[Tuple[Union[date, datetime], Union[date, datetime]]]
) -> Optional[Tuple[datetime, datetime]]:
	if frame is not None:
		now_time = get_current_time_in_seconds().time()
		return datetime.combine(frame[0], now_time).replace(hour=0, minute=0, second=0, microsecond=0), \
			datetime.combine(frame[1], now_time).replace(hour=23, minute=59, second=59, microsecond=999999)
	else:
		return None


def compute_time_frame(time_frame: ObjectiveTimeFrame) -> Optional[Tuple[datetime, datetime]]:
	"""
	compute time frame, get none if there is no time frame declared from given configuration.
	or a tuple contains from(00:00:00.000000) and to(23:59:59.999999) date time.
	"""
	return add_time_part(compute_time_frame_on_date(time_frame))


def compute_time_frame_on_date(time_frame: ObjectiveTimeFrame) -> Optional[Tuple[date, date]]:
	"""
	compute time frame, get none if there is no time frame declared from given configuration.
	or a tuple contains from and to date
	"""
	last_day = compute_last_day(time_frame)
	last_n = compute_last_n(time_frame)
	kind = time_frame.kind

	if kind == ObjectiveTimeFrameKind.YEAR:
		if last_day_of_month(last_day) == last_day.day:
			return move_month(last_day.replace(day=1), '-', 11), last_day
		else:
			return move_year(last_day, '-', 1) + timedelta(days=1), last_day
	elif kind == ObjectiveTimeFrameKind.HALF_YEAR:
		if last_day_of_month(last_day) == last_day.day:
			return move_month(last_day.replace(day=1), '-', 5), last_day
		else:
			return move_month(last_day, '-', 6) + timedelta(days=1), last_day
	elif kind == ObjectiveTimeFrameKind.QUARTER:
		if last_day_of_month(last_day) == last_day.day:
			return move_month(last_day.replace(day=1), '-', 2), last_day
		else:
			return move_month(last_day, '-', 3) + timedelta(days=1), last_day
	elif kind == ObjectiveTimeFrameKind.MONTH:
		if last_day_of_month(last_day) == last_day.day:
			return last_day.replace(day=1), last_day
		else:
			return move_month(last_day, '-', 1) + timedelta(days=1), last_day
	elif kind == ObjectiveTimeFrameKind.WEEK_OF_YEAR:
		return last_day - timedelta(days=6), last_day
	elif kind == ObjectiveTimeFrameKind.DAY_OF_MONTH or kind == ObjectiveTimeFrameKind.DAY_OF_WEEK:
		return last_day, last_day
	elif kind == ObjectiveTimeFrameKind.LAST_N_YEARS:
		if last_day_of_month(last_day) == last_day.day:
			return move_month(last_day.replace(day=1), '-', (last_n - 1) * 12 + 11), last_day
		else:
			return move_year(last_day, '-', last_n) + timedelta(days=1), last_day
	elif kind == ObjectiveTimeFrameKind.LAST_N_MONTHS:
		if last_day_of_month(last_day) == last_day.day:
			return move_month(last_day.replace(day=1), '-', last_n - 1), last_day
		else:
			return move_month(last_day, '-', last_n) + timedelta(days=1), last_day
	elif kind == ObjectiveTimeFrameKind.LAST_N_WEEKS:
		return last_day - timedelta(days=last_n * 7 - 1), last_day
	elif kind == ObjectiveTimeFrameKind.LAST_N_DAYS:
		return last_day - timedelta(days=last_n - 1), last_day
	elif kind == ObjectiveTimeFrameKind.NONE:
		return None
	else:
		return None


def compute_previous_frame(
		time_frame: ObjectiveTimeFrame, current_frame: Optional[Tuple[datetime, datetime]]
) -> Optional[Tuple[datetime, datetime]]:
	"""
	compute previous time frame, get none if there is no time frame declared from given configuration.
	or a tuple contains from(00:00:00.000000) and to(23:59:59.999999) date time.
	"""
	return add_time_part(compute_previous_frame_on_date(time_frame, current_frame))


def compute_previous_frame_on_date(
		time_frame: ObjectiveTimeFrame, current_frame: Optional[Tuple[date, date]]
) -> Optional[Tuple[date, date]]:
	"""
	compute previous time frame, get none if there is no time frame declared from given configuration.
	or a tuple contains from and to date time.
	"""
	if current_frame is None:
		return None

	start, _ = current_frame
	last_n = compute_last_n(time_frame)
	kind = time_frame.kind

	if kind == ObjectiveTimeFrameKind.YEAR:
		return move_year(start, '-', 1), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.HALF_YEAR:
		return move_month(start, '-', 6), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.QUARTER:
		return move_month(start, '-', 3), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.MONTH:
		return move_month(start, '-', 1), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.WEEK_OF_YEAR:
		return start - timedelta(days=7), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.DAY_OF_MONTH or kind == ObjectiveTimeFrameKind.DAY_OF_WEEK:
		return start - timedelta(days=1), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.LAST_N_YEARS:
		return move_year(start, '-', last_n), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.LAST_N_MONTHS:
		return move_month(start, '-', last_n), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.LAST_N_WEEKS:
		return start - timedelta(days=last_n * 7), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.LAST_N_DAYS:
		return start - timedelta(days=last_n), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.NONE:
		return None
	else:
		return None


def compute_chain_frame(
		time_frame: ObjectiveTimeFrame, current_frame: Optional[Tuple[datetime, datetime]]
) -> Optional[Tuple[datetime, datetime]]:
	"""
	compute chain time frame, get none if there is no time frame declared from given configuration.
	or a tuple contains from(00:00:00.000000) and to(23:59:59.999999) date time.
	"""
	return add_time_part(compute_chain_frame_on_date(time_frame, current_frame))


def compute_chain_frame_on_date(
		time_frame: ObjectiveTimeFrame, current_frame: Optional[Tuple[datetime, datetime]]
) -> Optional[Tuple[date, date]]:
	"""
	compute chain time frame, get none if there is no time frame declared from given configuration.
	or a tuple contains from and to date time.
	"""
	if current_frame is None:
		return None

	start, end = current_frame
	last_n = compute_last_n(time_frame)
	kind = time_frame.kind

	if kind == ObjectiveTimeFrameKind.YEAR:
		return move_year(start, '-', 1), start - timedelta(days=1)
	elif kind == ObjectiveTimeFrameKind.HALF_YEAR \
			or kind == ObjectiveTimeFrameKind.QUARTER \
			or kind == ObjectiveTimeFrameKind.MONTH \
			or kind == ObjectiveTimeFrameKind.WEEK_OF_YEAR:
		return move_year(start, '-', 1), move_year(end, '-', 1)
	elif kind == ObjectiveTimeFrameKind.DAY_OF_MONTH:
		return move_month(start, '-', 1), move_month(end, '-', 1)
	elif kind == ObjectiveTimeFrameKind.DAY_OF_WEEK:
		return start - timedelta(days=7), end - timedelta(days=7)
	elif kind == ObjectiveTimeFrameKind.LAST_N_YEARS:
		return move_year(start, '-', last_n * 2), move_year(start - timedelta(days=1), '-', last_n)
	elif kind == ObjectiveTimeFrameKind.LAST_N_MONTHS:
		return move_year(start, '-', 1), move_year(end, '-', 1)
	elif kind == ObjectiveTimeFrameKind.LAST_N_WEEKS:
		return move_year(start, '-', 1), move_year(end, '-', 1)
	elif kind == ObjectiveTimeFrameKind.LAST_N_DAYS:
		return move_year(start, '-', 1), move_year(end, '-', 1)
	elif kind == ObjectiveTimeFrameKind.NONE:
		return None
	else:
		return None
