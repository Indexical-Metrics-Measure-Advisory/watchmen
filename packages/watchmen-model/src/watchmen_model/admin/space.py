from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import construct_parameter_joint, DataModel, OptimisticLock, ParameterJoint, SpaceId, \
	TenantBasedTuple, TopicId, UserGroupId
from watchmen_utilities import ArrayHelper


# noinspection PyRedundantParentheses,DuplicatedCode
class AvoidFastApiError:
	joint: ParameterJoint = None


class SpaceFilter(DataModel, AvoidFastApiError, BaseModel):
	topicId: TopicId = None
	enabled: bool = False

	def __setattr__(self, name, value):
		if name == 'joint':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


def construct_filter(a_filter: Optional[Union[dict, SpaceFilter]]) -> Optional[SpaceFilter]:
	if a_filter is None:
		return None
	elif isinstance(a_filter, SpaceFilter):
		return a_filter
	else:
		# noinspection PyArgumentList
		return SpaceFilter(**a_filter)


def construct_filters(filters: Optional[list] = None) -> Optional[List[SpaceFilter]]:
	if filters is None:
		return None
	else:
		return ArrayHelper(filters).map(lambda x: construct_filter(x)).to_list()


class Space(TenantBasedTuple, OptimisticLock, BaseModel):
	spaceId: SpaceId = None
	name: str = None
	description: str = None
	topicIds: List[TopicId] = None
	groupIds: List[UserGroupId] = None
	filters: List[SpaceFilter] = None

	def __setattr__(self, name, value):
		if name == 'filters':
			super().__setattr__(name, construct_filters(value))
		else:
			super().__setattr__(name, value)
