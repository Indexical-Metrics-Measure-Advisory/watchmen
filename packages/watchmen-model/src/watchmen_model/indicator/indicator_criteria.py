from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import BucketId, DataModel, FactorId
from watchmen_utilities import ArrayHelper, is_not_blank


class IndicatorCriteria(DataModel, BaseModel):
	factorId: FactorId = None


class IndicatorCriteriaOnBucket(IndicatorCriteria):
	"""
	fill when use predefined bucket
	"""
	bucketId: BucketId = None
	bucketSegmentName: str = None


class IndicatorCriteriaOperator(str, Enum):
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS = 'less',
	LESS_EQUALS = 'less-equals',
	MORE = 'more',
	MORE_EQUALS = 'more-equals',


class IndicatorCriteriaOnExpression(IndicatorCriteria):
	operator: IndicatorCriteriaOperator = IndicatorCriteriaOperator.EQUALS
	value: str = None


def construct_indicator_criteria(criteria: Optional[Union[dict, IndicatorCriteria]]) -> Optional[IndicatorCriteria]:
	if criteria is None:
		return None
	elif isinstance(criteria, IndicatorCriteria):
		return criteria
	else:
		bucket_id = criteria.get('bucketId')
		if is_not_blank(bucket_id):
			return IndicatorCriteriaOnBucket(**criteria)
		operator = criteria.get('operator')
		if is_not_blank(operator):
			return IndicatorCriteriaOnExpression(**criteria)
		else:
			return IndicatorCriteria(**criteria)


def construct_indicator_criteria_list(
		criteria_list: Optional[list] = None) -> Optional[List[IndicatorCriteria]]:
	if criteria_list is None:
		return None
	else:
		return ArrayHelper(criteria_list).map(lambda x: construct_indicator_criteria(x)).to_list()
