from typing import Dict, List

from watchmen_model.common import TenantBasedTuple, ScheduledTaskId, Storable
from pydantic import BaseModel
from enum import Enum, IntEnum


class ResultStatus(str, Enum):
	CHECK_KEY_FAILED = "CHECK_KEY_FAILED"
	DEPENDENCY_FAILED = "DEPENDENCY_FAILED"
	CREATE_TASK_SUCCESS = "CREATE_TASK_SUCCESS"
	CREATE_TASK_FAILED = "CREATE_TASK_FAILED"
	EMPTY_PAYLOAD = "EMPTY_PAYLOAD"
	COMPLETED_TASK = "COMPLETED_TASK"
	PROCESS_TASK_FAILED = "PROCESS_TASK_FAILED"


class TaskStatus(IntEnum):
	INITIAL = 0
	SUCCESS = 1
	FAILED = 2
	SUSPEND = 3


class Dependence(Storable, BaseModel):
	modelName: str
	objectId: str


class ScheduledTask(TenantBasedTuple, BaseModel):
	taskId: ScheduledTaskId
	resourceId: str  # global unique, monotonous increase
	content: Dict
	modelName: str
	objectId: str
	dependencies: List[Dependence]
	status: TaskStatus
	result: str

