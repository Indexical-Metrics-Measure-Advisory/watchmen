from typing import Dict, List, Optional, Union

from watchmen_utilities import ArrayHelper, ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, ScheduledTaskId, Storable

from enum import Enum


class TaskType(int, Enum):
	DEFAULT = 1,
	RUN_PIPELINE = 2,
	GROUP = 3


class Result(str, Enum):
	DEPENDENCY_FAILED = "DEPENDENCY_FAILED"
	PROCESS_TASK_SUCCESS = "PROCESS_TASK_SUCCESS"
	PROCESS_TASK_FAILED = "PROCESS_TASK_FAILED"


class Dependence(Storable, ExtendedBaseModel):
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


class ScheduledTask(TenantBasedTuple, ExtendedBaseModel):
	taskId: Optional[ScheduledTaskId] = None
	resourceId:  Optional[str] = None  # global unique, monotonous increase
	topicCode:  Optional[str] = None
	content:  Optional[Dict] = None
	changeJsonIds:  Optional[List[int]] = None
	modelName:  Optional[str] = None
	objectId:  Optional[str] = None
	dependOn:  Optional[List[Dependence]] = None
	parentTaskId:  Optional[List[int]] = None
	isFinished:  Optional[bool] = None
	status:  Optional[int] = None
	result:  Optional[Dict] = None
	eventId:  Optional[str] = None  # Deprecated
	eventTriggerId:  Optional[int] = None
	pipelineId:  Optional[str] = None
	type:  Optional[int] = None

	def __setattr__(self, name, value):
		if name == 'dependOn':
			super().__setattr__(name, construct_depend_on(value))
		else:
			super().__setattr__(name, value)

