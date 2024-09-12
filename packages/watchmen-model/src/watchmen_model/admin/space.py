from typing import List, Optional, Union

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import construct_parameter_joint, DataModel, OptimisticLock, ParameterJoint, SpaceId, \
	TenantBasedTuple, TopicId, UserGroupId
from watchmen_utilities import ArrayHelper


class SpaceFilter(ExtendedBaseModel):
	topicId: Optional[TopicId] = None
	enabled: bool = False
	joint: ParameterJoint = None

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


class Space(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	spaceId: Optional[SpaceId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	topicIds: Optional[List[TopicId]] = None
	groupIds: Optional[List[UserGroupId]] = None
	filters: Optional[List[SpaceFilter]] = None

	def __setattr__(self, name, value):
		if name == 'filters':
			super().__setattr__(name, construct_filters(value))
		else:
			super().__setattr__(name, value)
