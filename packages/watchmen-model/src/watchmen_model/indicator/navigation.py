from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import Auditable, BucketId, DataModel, FactorId, IndicatorId, NavigationId, UserBasedTuple
from watchmen_utilities import ArrayHelper, is_not_blank
from .indicator import IndicatorAggregateArithmetic


class NavigationIndicatorCriteria(DataModel, BaseModel):
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


def construct_indicator_criteria(
		criteria: Optional[Union[dict, NavigationIndicatorCriteria]]) -> Optional[NavigationIndicatorCriteria]:
	if criteria is None:
		return None
	elif isinstance(criteria, NavigationIndicatorCriteria):
		return criteria
	else:
		bucket_id = criteria.get('bucketId')
		if is_not_blank(bucket_id):
			return NavigationIndicatorCriteriaOnBucket(**criteria)
		operator = criteria.get('operator')
		if is_not_blank(operator):
			return NavigationIndicatorCriteriaOnExpression(**criteria)
		else:
			return NavigationIndicatorCriteria(**criteria)


def construct_indicator_criteria_list(
		criteria_list: Optional[list] = None) -> Optional[List[NavigationIndicatorCriteria]]:
	if criteria_list is None:
		return None
	else:
		return ArrayHelper(criteria_list).map(lambda x: construct_indicator_criteria(x)).to_list()


class NavigationIndicator(DataModel, BaseModel):
	indicatorId: IndicatorId = None
	name: str = None
	aggregateArithmetic: IndicatorAggregateArithmetic = None
	formula: str = None
	includeInFinalScore: bool = True
	criteria: List[NavigationIndicatorCriteria] = []
	variableName: str = None

	def __setattr__(self, name, value):
		if name == 'criteria':
			super().__setattr__(name, construct_indicator_criteria_list(value))
		else:
			super().__setattr__(name, value)


MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID = '-1'


class ManualComputeNavigationIndicator(NavigationIndicator):
	"""
	for manual compute indicator,
	1. indicatorId fixed as {@link MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID},
	2. aggregateArithmetics fixed as {@link IndicatorAggregateArithmetic#MAX}, will be ignored anyway in runtime
	3. criteria fixed as zero length array, will be ignored anyway in runtime
	"""
	indicatorId: IndicatorId = MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID
	aggregateArithmetic: IndicatorAggregateArithmetic = IndicatorAggregateArithmetic.MAX


class NavigationTimeRangeType(str, Enum):
	YEAR = 'year',
	MONTH = 'month'


def construct_indicator(indicator: Optional[Union[dict, NavigationIndicator]]) -> Optional[NavigationIndicator]:
	if indicator is None:
		return None
	elif isinstance(indicator, NavigationIndicator):
		return indicator
	else:
		indicator_id = indicator.get('indicatorId')
		if indicator_id == MANUAL_COMPUTE_NAVIGATION_INDICATOR_ID:
			return ManualComputeNavigationIndicator(**indicator)
		else:
			return NavigationIndicator(**indicator)


def construct_indicators(indicators: Optional[list] = None) -> Optional[List[NavigationIndicator]]:
	if indicators is None:
		return None
	else:
		return ArrayHelper(indicators).map(lambda x: construct_indicator(x)).to_list()


class Navigation(UserBasedTuple, Auditable, BaseModel):
	navigationId: NavigationId = None
	name: str = None
	description: str = None
	timeRangeType: NavigationTimeRangeType = NavigationTimeRangeType.YEAR
	timeRangeYear: str = None
	timeRangeMonth: str = None
	compareWithPreviousTimeRange: bool = False
	indicators: List[NavigationIndicator] = []

	def __setattr__(self, name, value):
		if name == 'indicators':
			super().__setattr__(name, construct_indicators(value))
		else:
			super().__setattr__(name, value)
