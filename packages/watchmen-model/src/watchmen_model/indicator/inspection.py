from enum import Enum
from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import Auditable, BucketId, DataModel, FactorId, IndicatorId, InspectionId, UserBasedTuple
from watchmen_utilities import ArrayHelper
from .indicator import IndicatorAggregateArithmetic
from .indicator_criteria import construct_indicator_criteria_list, IndicatorCriteria
from .measure_method import MeasureMethod


class InspectMeasureOn(str, Enum):
	NONE = 'none',
	VALUE = 'value',
	OTHER = 'other',


class InspectionTimeRangeType(str, Enum):
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	HALF_MONTH = 'half-month',
	TEN_DAYS = 'ten-days',
	WEEK_OF_YEAR = 'week-of-year',
	WEEK_OF_MONTH = 'week-of-month',
	HALF_WEEK = 'half-week',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',
	DAY_KIND = 'day-kind',
	HOUR = 'hour',
	HOUR_KIND = 'hour-kind',
	AM_PM = 'am-pm',


class InspectionTimeRange(DataModel, BaseModel):
	type: InspectionTimeRangeType = None
	value: Any = None


class InspectionYearRange(InspectionTimeRange):
	type: InspectionTimeRangeType.YEAR
	value: int


class InspectionHalfYearRange(InspectionTimeRange):
	type: InspectionTimeRangeType.HALF_YEAR
	value: Literal[1, 2]


class InspectionQuarterRange(InspectionTimeRange):
	type: InspectionTimeRangeType.QUARTER
	value: Literal[1, 2, 3, 4]


class InspectionMonthRange(InspectionTimeRange):
	type: InspectionTimeRangeType.MONTH
	value: Literal[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]


class InspectionHalfMonthRange(InspectionTimeRange):
	type: InspectionTimeRangeType.HALF_MONTH
	value: Literal[1, 2]


class InspectionTenDaysRange(InspectionTimeRange):
	type: InspectionTimeRangeType.TEN_DAYS
	value: Literal[1, 2, 3]


class InspectionWeekOfYearRange(InspectionTimeRange):
	type: InspectionTimeRangeType.WEEK_OF_YEAR
	value: int  # 0 - 53


class InspectionWeekOfMonthRange(InspectionTimeRange):
	type: InspectionTimeRangeType.WEEK_OF_MONTH
	value: Literal[0, 1, 2, 3, 4, 5]


class InspectionHalfWeekRange(InspectionTimeRange):
	type: InspectionTimeRangeType.HALF_WEEK
	value: Literal[1, 2]


class InspectionDayOfMonthRange(InspectionTimeRange):
	type: InspectionTimeRangeType.DAY_OF_MONTH
	value: int  # 1 - 31


class InspectionDayOfWeekRange(InspectionTimeRange):
	type: InspectionTimeRangeType.DAY_OF_WEEK
	value: Literal[1, 2, 3, 4, 5, 6, 7]


class InspectionDayKindRange(InspectionTimeRange):
	type: InspectionTimeRangeType.DAY_KIND
	value: Literal[1, 2, 3]


class InspectionHourRange(InspectionTimeRange):
	type: InspectionTimeRangeType.HOUR
	value: int  # / 0 - 23


class InspectionHourKindRange(InspectionTimeRange):
	type: InspectionTimeRangeType.HOUR_KIND
	value: Literal[1, 2, 3]


class InspectionAmPmRange(InspectionTimeRange):
	type: InspectionTimeRangeType.AM_PM
	value: Literal[1, 2]


def construct_time_range(a_range: Optional[Union[dict, InspectionTimeRange]]) -> Optional[InspectionTimeRange]:
	if a_range is None:
		return None
	elif isinstance(a_range, InspectionTimeRange):
		return a_range

	range_type = a_range.get('type')
	if range_type == InspectionTimeRangeType.YEAR:
		return InspectionYearRange(**a_range)
	elif range_type == InspectionTimeRangeType.HALF_YEAR:
		return InspectionHalfYearRange(**a_range)
	elif range_type == InspectionTimeRangeType.QUARTER:
		return InspectionQuarterRange(**a_range)
	elif range_type == InspectionTimeRangeType.MONTH:
		return InspectionMonthRange(**a_range)
	elif range_type == InspectionTimeRangeType.HALF_MONTH:
		return InspectionHalfMonthRange(**a_range)
	elif range_type == InspectionTimeRangeType.TEN_DAYS:
		return InspectionTenDaysRange(**a_range)
	elif range_type == InspectionTimeRangeType.WEEK_OF_YEAR:
		return InspectionWeekOfYearRange(**a_range)
	elif range_type == InspectionTimeRangeType.WEEK_OF_MONTH:
		return InspectionWeekOfMonthRange(**a_range)
	elif range_type == InspectionTimeRangeType.HALF_WEEK:
		return InspectionHalfWeekRange(**a_range)
	elif range_type == InspectionTimeRangeType.DAY_OF_MONTH:
		return InspectionDayOfMonthRange(**a_range)
	elif range_type == InspectionTimeRangeType.DAY_OF_WEEK:
		return InspectionDayOfWeekRange(**a_range)
	elif range_type == InspectionTimeRangeType.DAY_KIND:
		return InspectionDayKindRange(**a_range)
	elif range_type == InspectionTimeRangeType.HOUR:
		return InspectionHourRange(**a_range)
	elif range_type == InspectionTimeRangeType.HOUR_KIND:
		return InspectionHourKindRange(**a_range)
	elif range_type == InspectionTimeRangeType.AM_PM:
		return InspectionAmPmRange(**a_range)
	else:
		raise Exception(f'Inspection time range type[{range_type}] cannot be recognized.')


def construct_time_ranges(ranges: Optional[list] = None) -> Optional[List[InspectionTimeRange]]:
	if ranges is None:
		return None
	else:
		return ArrayHelper(ranges).map(lambda x: construct_time_range(x)).to_list()


class Inspection(UserBasedTuple, Auditable, BaseModel):
	inspectionId: InspectionId = None
	name: str = None
	indicatorId: IndicatorId = None
	# indicator value aggregate arithmetic
	aggregateArithmetics: List[IndicatorAggregateArithmetic] = []
	# none, measure on indicator value or other factor
	measureOn: InspectMeasureOn = None
	# if measure on factor, factor id must be given
	measureOnFactorId: FactorId = None
	# bucket for any measure on type, or no bucket also allowed if measure on factor rather than indicator value
	measureOnBucketId: BucketId = None
	# time range
	timeRangeMeasure: MeasureMethod = None
	# time range factor
	timeRangeFactorId: FactorId = None
	# ranges on time factor for filter data
	timeRanges: List[InspectionTimeRange] = None
	# time measure on factor. measure can use another factor or just measure on the same time factor
	measureOnTime: MeasureMethod = None
	# time measure on factor
	measureOnTimeFactorId: FactorId = None
	criteria: List[IndicatorCriteria] = []

	def __setattr__(self, name, value):
		if name == 'timeRanges':
			super().__setattr__(name, construct_time_ranges(value))
		elif name == 'criteria':
			super().__setattr__(name, construct_indicator_criteria_list(value))
		else:
			super().__setattr__(name, value)
