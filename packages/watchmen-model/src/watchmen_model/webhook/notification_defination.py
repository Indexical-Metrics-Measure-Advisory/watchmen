from enum import Enum
from typing import List, Optional, Union

from watchmen_model.common import NotificationDefinitionId, OptimisticLock, TenantBasedTuple, UserId
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class NotificationParam(ExtendedBaseModel):
	name: Optional[str] = None
	value: Optional[str] = None


class NotificationType(str, Enum):
	EMAIL = "email"
	WEB_URL = "url"
	SLACK = "slack"
	TEAMS = "teams"
	FEISHU = "feishu"


def construct_param(param: Optional[Union[dict, NotificationParam]]) -> Optional[NotificationParam]:
	if param is None:
		return None
	elif isinstance(param, NotificationParam):
		return param
	else:
		return NotificationParam(**param)


def construct_params(params: Optional[list] = None) -> Optional[List[NotificationParam]]:
	if params is None:
		return None
	else:
		return ArrayHelper(params).map(lambda x: construct_param(x)).to_list()


class NotificationDefinition(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	notificationId: Optional[NotificationDefinitionId] = None
	type: Optional[NotificationType] = None
	params: List[NotificationParam] = []
	userId: Optional[UserId] = None

	def __setattr__(self, name, value):
		if name == 'params':
			super().__setattr__(name, construct_params(value))
		else:
			super().__setattr__(name, value)
