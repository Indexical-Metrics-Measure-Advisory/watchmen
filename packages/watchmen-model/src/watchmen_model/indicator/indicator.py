from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import BucketId, construct_parameter_joint, DataModel, FactorId, IndicatorId, \
	OptimisticLock, ParameterJoint, SubjectDatasetColumnId, SubjectId, TenantBasedTuple, TopicId
from watchmen_utilities import ArrayHelper


class IndicatorAggregateArithmetic(str, Enum):
	COUNT = 'count'
	SUM = 'sum'
	AVG = 'avg'
	MAX = 'max'
	MIN = 'min'


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


class IndicatorBaseOn(str, Enum):
	TOPIC = 'topic',
	SUBJECT = 'subject'


# noinspection PyRedundantParentheses,DuplicatedCode
class AvoidFastApiError:
	joint: ParameterJoint = None


class IndicatorFilter(DataModel, AvoidFastApiError, BaseModel):
	enabled: bool = False

	def __setattr__(self, name, value):
		if name == 'joint':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


def construct_filter(a_filter: Optional[Union[dict, IndicatorFilter]]) -> Optional[IndicatorFilter]:
	if a_filter is None:
		return None
	elif isinstance(a_filter, IndicatorFilter):
		return a_filter
	else:
		# noinspection PyArgumentList
		return IndicatorFilter(**a_filter)


class Indicator(TenantBasedTuple, OptimisticLock, BaseModel):
	indicatorId: IndicatorId = None
	name: str = None
	# when indicator is on topic
	topicOrSubjectId: Union[TopicId, SubjectId] = None
	# is a count indicator when factor is not declared
	# it is columnId when base one a subject
	factorId: Union[FactorId, SubjectDatasetColumnId] = None
	# only count can be applied when factor id is not declared
	aggregateArithmetic: IndicatorAggregateArithmetic = None
	baseOn: IndicatorBaseOn = None
	category1: str = None
	category2: str = None
	category3: str = None
	description: str = None
	# effective only when factorId is appointed
	valueBuckets: List[BucketId] = []
	# noinspection SpellCheckingInspection
	relevants: List[RelevantIndicator] = []
	filter: IndicatorFilter = None

	def __setattr__(self, name, value):
		if name == 'relevants':
			super().__setattr__(name, construct_relevants(value))
		elif name == 'filter':
			super().__setattr__(name, construct_filter(value))
		else:
			super().__setattr__(name, value)
