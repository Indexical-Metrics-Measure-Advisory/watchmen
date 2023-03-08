from typing import Dict, List, Optional, Union

from watchmen_utilities import ArrayHelper

from watchmen_model.common import TenantBasedTuple, ScheduledTaskId, Storable
from pydantic import BaseModel
from enum import Enum


class Result(str, Enum):
	DEPENDENCY_FAILED = "DEPENDENCY_FAILED"
	PROCESS_TASK_SUCCESS = "PROCESS_TASK_SUCCESS"
	PROCESS_TASK_FAILED = "PROCESS_TASK_FAILED"


class Dependence(Storable, BaseModel):
	modelName: str
	objectId: str


def construct_dependence(dependence: Union[Dependence, Dict]) -> Optional[Dependence]:
	if dependence is None:
		return None
	elif isinstance(dependence, Dependence):
		return dependence
	else:
		return Dependence(**dependence)


def construct_depend_on(depend_on: Optional[List[Union[Dependence, Dict]]]) -> Optional[List[Dependence]]:
	if depend_on is None:
		return None
	else:
		return ArrayHelper(depend_on).map(lambda x: construct_dependence(x)).to_list()


class ScheduledTask(TenantBasedTuple, BaseModel):
	taskId: ScheduledTaskId
	resourceId: str  # global unique, monotonous increase
	topicCode: str
	content: Dict
	modelName: str
	objectId: str
	dependOn: List[Dependence]
	parentTaskId: List[int]
	isFinished: bool
	result: Dict

	def __setattr__(self, name, value):
		if name == 'dependOn':
			super().__setattr__(name, construct_depend_on(value))
		else:
			super().__setattr__(name, value)
