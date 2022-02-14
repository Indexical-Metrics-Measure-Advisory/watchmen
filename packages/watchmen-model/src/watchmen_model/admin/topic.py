from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import DataSourceId, OptimisticLock, TenantBasedTuple, TopicId
from .factor import Factor


class TopicKind(str, Enum):
	SYSTEM = 'system',
	BUSINESS = 'business'


class TopicType(str, Enum):
	RAW = 'raw',
	META = 'meta',
	DISTINCT = 'distinct',
	AGGREGATE = 'aggregate',
	TIME = 'time',
	RATIO = 'ratio'


class Topic(TenantBasedTuple, OptimisticLock, BaseModel):
	topicId: TopicId = None
	name: str = None
	type: TopicType = TopicType.DISTINCT
	kind: TopicKind = TopicKind.BUSINESS
	dataSourceId: DataSourceId = None
	factors: List[Factor] = []
	description: str = None


def is_raw_topic(self) -> bool:
	return self.topic.type == TopicType.RAW


def is_aggregation_topic(self) -> bool:
	topic_type = self.topic.type
	return topic_type == TopicType.AGGREGATE or topic_type == TopicType.RATIO or topic_type == TopicType.TIME
