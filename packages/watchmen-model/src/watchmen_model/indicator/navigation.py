from typing import List

from pydantic import BaseModel

from watchmen_model.admin import Enum
from watchmen_model.common import BucketId, FactorId, IndicatorId, NavigationId, OptimisticLock, TenantBasedTuple
from .indicator import IndicatorAggregateArithmetic


class NavigationIndicatorCriteria(BaseModel):
	factorId: FactorId = None


class NavigationIndicatorCriteriaOnBucket(NavigationIndicatorCriteria):
	"""
	fill when use predefined bucket
	"""
	bucketId: BucketId = None
	bucketSegmentName: str = None


class NavigationIndicatorCriteriaOperator(str, Enum):
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS = 'less',
	LESS_EQUALS = 'less-equals',
	MORE = 'more',
	MORE_EQUALS = 'more-equals',


class NavigationIndicatorCriteriaOnExpression(NavigationIndicatorCriteria):
	operator: NavigationIndicatorCriteriaOperator = NavigationIndicatorCriteriaOperator.EQUALS
	value: str = None


class NavigationIndicator(BaseModel):
	indicatorId: IndicatorId = None
	name: str = None
	aggregateArithmetic: IndicatorAggregateArithmetic = None
	formula: str = None
	includeInFinalScore: bool = True
	criteria: List[NavigationIndicatorCriteria] = []
	variableName: str = None


MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID = '-1'


class ManualComputeNavigationIndicator(NavigationIndicator):
	"""
	for manual compute indicator,
	1. indicatorId fixed as {@link MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID},
	2. aggregateArithmetics fixed as {@link IndicatorAggregateArithmetic#MAX}, will be ignored anyway in runtime
	3. criteria fixed as zero length array, will be ignored anyway in runtime
	"""
	indicatorId: MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID = MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID
	aggregateArithmetic: IndicatorAggregateArithmetic.MAX = IndicatorAggregateArithmetic.MAX


class NavigationTimeRangeType(str, Enum):
	YEAR = 'year',
	MONTH = 'month'


class Navigation(TenantBasedTuple, OptimisticLock):
	navigationId: NavigationId = None
	name: str = None
	description: str = None
	timeRangeType: NavigationTimeRangeType = NavigationTimeRangeType.YEAR
	timeRangeYear: str = None
	timeRangeMonth: str = None
	compareWithPreviousTimeRange: bool = False
	indicators: List[NavigationIndicator] = []
