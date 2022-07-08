from enum import Enum
from typing import Dict, List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import DataSourceId, OptimisticLock, TenantBasedTuple, TopicId
from watchmen_utilities import ArrayHelper
from .factor import Factor


class TopicKind(str, Enum):
	SYSTEM = 'system',
	BUSINESS = 'business'
	SYNONYM = 'synonym'


class TopicType(str, Enum):
	RAW = 'raw',
	META = 'meta',
	DISTINCT = 'distinct',
	AGGREGATE = 'aggregate',
	TIME = 'time',
	RATIO = 'ratio'


def construct_factor(factor: Union[Factor, Dict]) -> Optional[Factor]:
	if factor is None:
		return None
	elif isinstance(factor, Factor):
		return factor
	else:
		return Factor(**factor)


def construct_factors(factors: Optional[List[Union[Factor, Dict]]]) -> Optional[List[Factor]]:
	if factors is None:
		return None
	else:
		return ArrayHelper(factors).map(lambda x: construct_factor(x)).to_list()


class Topic(TenantBasedTuple, OptimisticLock, BaseModel):
	topicId: TopicId = None
	name: str = None
	type: TopicType = TopicType.DISTINCT
	kind: TopicKind = TopicKind.BUSINESS
	dataSourceId: DataSourceId = None
	factors: List[Factor] = []
	description: str = None

	def __setattr__(self, name, value):
		if name == 'factors':
			super().__setattr__(name, construct_factors(value))
		else:
			super().__setattr__(name, value)


def is_raw_topic(topic: Topic) -> bool:
	return topic.type == TopicType.RAW


def is_aggregation_topic(topic: Topic) -> bool:
	topic_type = topic.type
	return topic_type == TopicType.AGGREGATE or topic_type == TopicType.RATIO or topic_type == TopicType.TIME
