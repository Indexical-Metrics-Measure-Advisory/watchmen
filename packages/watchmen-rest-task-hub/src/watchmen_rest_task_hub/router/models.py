from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from watchmen_task_hub.model import AlertEventType, DependencyAdoptionStatus, DependencyCondition, DependencyKind, \
	EngineRef, ExecutionMode, ExternalTriggerConfig, TaskCallbackConfig, TaskDefinition, TaskRunStatus, TaskSchedule, \
	TaskType, UpstreamInstancePolicy


class TaskPageRequest(BaseModel):
	keyword: Optional[str] = None
	taskType: Optional[TaskType] = None
	pageNumber: int = Field(default=1, ge=1)
	pageSize: int = Field(default=20, ge=1, le=200)


class TaskWriteRequest(BaseModel):
	name: str
	description: Optional[str] = None
	taskType: TaskType
	executionMode: Optional[ExecutionMode] = None
	engineRef: EngineRef
	schedule: Optional[TaskSchedule] = None
	enabled: bool = True
	ownerId: Optional[str] = None
	tags: List[str] = Field(default_factory=list)
	params: Dict[str, Any] = Field(default_factory=dict)
	externalTrigger: ExternalTriggerConfig = Field(default_factory=ExternalTriggerConfig)
	callback: TaskCallbackConfig = Field(default_factory=TaskCallbackConfig)
	dependencyWaitTimeoutMinutes: int = Field(default=60, ge=1)
	freshnessSlaMinutes: Optional[int] = Field(default=None, ge=1)

	def to_task(self, task_id: Optional[str] = None, version: int = 1) -> TaskDefinition:
		data = self.model_dump(mode='python')
		if self.executionMode is None and self.schedule is not None:
			frequency = self.schedule.frequency
			data['executionMode'] = ExecutionMode.EVENT if frequency == 'EVENT' else \
				ExecutionMode.STREAMING if frequency == 'STREAMING' else ExecutionMode.SCHEDULED
		return TaskDefinition(**data, taskId=task_id, version=version)


class EnabledRequest(BaseModel):
	enabled: bool


class TagsRequest(BaseModel):
	tags: List[str]


class DependencyWriteRequest(BaseModel):
	upstreamTaskId: str
	downstreamTaskId: str
	condition: DependencyCondition = DependencyCondition.ON_SUCCESS
	instancePolicy: UpstreamInstancePolicy = UpstreamInstancePolicy.LATEST_RUN
	offsetDays: int = 0
	enabled: bool = True

	def to_dependency(self):
		from watchmen_task_hub.model import TaskDependency
		return TaskDependency(
			**self.model_dump(), kind=DependencyKind.EXPLICIT,
			adoptionStatus=DependencyAdoptionStatus.ACCEPTED)


class RerunRequest(BaseModel):
	runId: str
	params: Dict[str, Any] = Field(default_factory=dict)
	bypassDependencies: bool = False


class CallbackRequest(BaseModel):
	status: TaskRunStatus
	engineRunId: Optional[str] = None
	rowCount: Optional[int] = Field(default=None, ge=0)
	errorMessage: Optional[str] = None
	resultRefs: Dict[str, Any] = Field(default_factory=dict)


class AlertRuleWriteRequest(BaseModel):
	name: str
	scopeTaskId: Optional[str] = None
	scopeTaskType: Optional[TaskType] = None
	eventType: AlertEventType
	threshold: Dict[str, Any] = Field(default_factory=dict)
	channel: Dict[str, Any] = Field(default_factory=dict)
	throttleMinutes: int = Field(default=30, ge=1)
	enabled: bool = True
