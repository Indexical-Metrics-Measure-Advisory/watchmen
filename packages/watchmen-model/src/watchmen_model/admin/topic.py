from enum import Enum
from typing import List

from factor import Factor
from watchmen_model.common import DataSourceId, TenantId, TopicId, Tuple


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


class Topic(Tuple):
	topicId: TopicId = None
	name: str = None
	type: TopicType = TopicType.DISTINCT
	kind: TopicKind = TopicKind.BUSINESS
	dataSourceId: DataSourceId = None
	factors: List[Factor] = []
	description: str = None
	tenantId: TenantId = None
