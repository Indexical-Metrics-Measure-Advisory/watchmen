from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from json import JSONEncoder


class DateTimeEncoder(JSONEncoder):
	def default(self, o):
		if isinstance(o, (datetime, date)):
			return o.isoformat()
		if isinstance(o, Decimal):
			return float(o)
		return super().default(o)


def get_current_time_in_seconds() -> datetime:
	return datetime.now().replace(tzinfo=None, microsecond=0)


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
