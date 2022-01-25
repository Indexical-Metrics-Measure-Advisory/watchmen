from enum import Enum
from typing import Any, List, Literal

from pydantic import BaseModel

from watchmen_model.common import BucketId, FactorId, IndicatorId, InspectionId, TenantId, Tuple
from watchmen_model.indicator.indicator import IndicatorAggregateArithmetic
from watchmen_model.indicator.measure_method import MeasureMethod


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


class InspectionTimeRange(BaseModel):
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


class Inspection(Tuple):
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
	tenantId: TenantId = None
