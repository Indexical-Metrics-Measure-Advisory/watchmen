from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import BucketId, DataModel, FactorId, IndicatorId, OptimisticLock, TenantBasedTuple, TopicId
from watchmen_utilities import ArrayHelper
from .measure_method import MeasureMethod


class IndicatorAggregateArithmetic(str, Enum):
	COUNT = 'count'
	SUM = 'sum'
	AVG = 'avg'
	MAX = 'max'
	MIN = 'min'


class IndicatorMeasure(DataModel):
	factorId: FactorId = None
	method: MeasureMethod = None


class RelevantIndicatorType(str, Enum):
	SAME = 'same'
	HIGH_CORRELATED = 'high-correlated'
	WEAK_CORRELATED = 'weak-correlated'
	# /** this causes relevant */
	THIS_CAUSES_RELEVANT = 'this-causes-relevant'
	# /** relevant causes this */
	RELEVANT_CAUSES_THIS = 'relevant-causes-this'


class RelevantIndicator(DataModel, BaseModel):
	indicatorId: IndicatorId = None
	type: RelevantIndicatorType = None


def construct_relevant(relevant: Optional[Union[dict, RelevantIndicator]]) -> Optional[RelevantIndicator]:
	if relevant is None:
		return None
	elif isinstance(relevant, RelevantIndicator):
		return relevant
	else:
		# noinspection PyArgumentList
		return RelevantIndicator(**relevant)


def construct_relevants(relevants: Optional[list] = None) -> Optional[List[RelevantIndicator]]:
	if relevants is None:
		return None
	else:
		return ArrayHelper(relevants).map(lambda x: construct_relevant(x)).to_list()


class Indicator(TenantBasedTuple, OptimisticLock, BaseModel):
	indicatorId: IndicatorId = None
	name: str = None
	topicId: TopicId = None
	# is a count indicator when factor is not appointed
	factorId: FactorId = None
	category1: str = None
	category2: str = None
	category3: str = None
	description: str = None
	# effective only when factorId is appointed
	valueBuckets: List[BucketId] = []
	# noinspection SpellCheckingInspection
	relevants: List[RelevantIndicator] = []

	def __setattr__(self, name, value):
		if name == 'relevants':
			super().__setattr__(name, construct_relevants(value))
		else:
			super().__setattr__(name, value)
