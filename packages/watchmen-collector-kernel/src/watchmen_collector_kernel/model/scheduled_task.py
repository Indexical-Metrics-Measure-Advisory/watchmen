from typing import Dict, List

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

