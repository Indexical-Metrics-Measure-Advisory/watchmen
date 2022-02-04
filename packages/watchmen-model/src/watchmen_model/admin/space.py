from typing import List, Optional

from pydantic import BaseModel

from watchmen_model.common import DataModel, OptimisticLock, ParameterJoint, SpaceId, TenantBasedTuple, TopicId, \
	UserGroupId
from watchmen_utilities import ArrayHelper


class SpaceFilter(DataModel, BaseModel):
	topicId: TopicId = None
	joint: ParameterJoint = None
	enabled: bool = False


def construct_filters(filters: Optional[list] = None) -> Optional[List[SpaceFilter]]:
	if filters is None:
		return None
	return ArrayHelper(filters).map(lambda x: SpaceFilter(**x)).to_list()


class Space(TenantBasedTuple, OptimisticLock, BaseModel):
	spaceId: SpaceId = None
	name: str = None
	description: str = None
	topicIds: List[TopicId] = None
	groupIds: List[UserGroupId] = None
	filters: List[SpaceFilter] = None

	def __setattr__(self, name, value):
		if name == 'filters':
			filters = construct_filters(value)
			super().__setattr__(name, filters)
		else:
			super().__setattr__(name, value)
