from datetime import date, datetime, timedelta
from typing import Tuple

from watchmen_dqc.common import DqcException
from watchmen_model.dqc import MonitorRuleStatisticalInterval


def as_range(start_date: date, end_date: date) -> Tuple[datetime, datetime]:
	return datetime(
		year=start_date.year, month=start_date.month, day=start_date.day,
		hour=0, minute=0, second=0, microsecond=0, tzinfo=None
	), datetime(
		year=end_date.year, month=end_date.month, day=end_date.day,
		hour=23, minute=59, second=59, microsecond=999999, tzinfo=None
	)


def compute_date_range(process_date: date, frequency: MonitorRuleStatisticalInterval) -> Tuple[datetime, datetime]:
	if frequency == MonitorRuleStatisticalInterval.DAILY:
		return as_range(process_date, process_date)
	elif frequency == MonitorRuleStatisticalInterval.WEEKLY:
		# iso weekday: Monday is 1 and Sunday is 7
		weekday = process_date.isoweekday()
		sunday = process_date - timedelta(days=weekday % 7)
		saturday = sunday + timedelta(days=6)
		return as_range(sunday, saturday)
	elif frequency == MonitorRuleStatisticalInterval.MONTHLY:
		day_one = process_date.replace(day=1)
		day_last = (day_one + timedelta(days=31)).replace(day=1) - timedelta(days=1)
		return as_range(day_one, day_last)
	else:
		raise DqcException(f'Given frequency[{frequency}] is not supported.')
