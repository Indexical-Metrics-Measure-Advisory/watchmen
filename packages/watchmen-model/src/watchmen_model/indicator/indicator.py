from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import FactorId, IndicatorId, OptimisticLock, TenantId, TopicId, Tuple
from .measure_method import MeasureMethod


class IndicatorAggregateArithmetic(str, Enum):
	COUNT = 'count'
	SUM = 'sum'
	AVG = 'avg'
	MAX = 'max'
	MIN = 'min'


class IndicatorMeasure(BaseModel):
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


class RelevantIndicator(BaseModel):
	indicatorId: IndicatorId = None
	type: RelevantIndicatorType = None


class Indicator(Tuple, OptimisticLock):
	indicatorId: IndicatorId = None
	name: str = None
	topicId: TopicId = None
	# /** is a count indicator when factor is not appointed */
	factorId: FactorId = None
	category1: str = None
	category2: str = None
	category3: str = None
	description: str = None
	# /** effective only when factorId is appointed */
	valueBuckets: List[str] = []
	# noinspection SpellCheckingInspection
	relevants: List[RelevantIndicator] = []
	tenantId: TenantId = None
