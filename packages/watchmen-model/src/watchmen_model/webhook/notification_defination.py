from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import DataModel, NotificationDefinitionId, OptimisticLock, TenantBasedTuple, UserId
from watchmen_utilities import ArrayHelper


class NotificationParam(DataModel, BaseModel):
	name: str = None
	value: str = None


class NotificationType(str, Enum):
	EMAIL = "email"
	WEB_URL = "url"
	SLACK = "slack"
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


class NotificationDefinition(TenantBasedTuple, OptimisticLock, BaseModel):
	notificationId: NotificationDefinitionId = None
	type: NotificationType = None
	params: List[NotificationParam] = []
	userId: UserId = None

	def __setattr__(self, name, value):
		if name == 'params':
			super().__setattr__(name, construct_params(value))
		else:
			super().__setattr__(name, value)
