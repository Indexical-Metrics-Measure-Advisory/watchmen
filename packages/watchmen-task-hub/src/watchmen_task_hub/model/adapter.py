from datetime import date, datetime
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable

from watchmen_auth import PrincipalService
from watchmen_utilities import ExtendedBaseModel

from .run import TaskRun
from .task import TaskDefinition, TaskResourceRef, TaskType


class AdapterCapabilities(ExtendedBaseModel):
	discover: bool = False
	run: bool = False
	projection: bool = False
	setEnabled: bool = False
	rerun: bool = False
	managedSchedule: bool = False


class DiscoveredTask(ExtendedBaseModel):
	task: TaskDefinition
	refs: List[TaskResourceRef] = []


class SyncCursor(ExtendedBaseModel):
	updatedAt: Optional[datetime] = None
	afterRunId: Optional[str] = None


class RunHandle(ExtendedBaseModel):
	engineRunKey: str
	executionTarget: Optional[str] = None
	resultRefs: Dict[str, Any] = {}


class RunRequest(ExtendedBaseModel):
	processDate: Optional[date] = None
	windowStart: Optional[datetime] = None
	windowEnd: Optional[datetime] = None
	occurrence: Optional[datetime] = None
	params: Dict[str, Any] = {}
	bypassDependencies: bool = False
	idempotencyKey: Optional[str] = None

	def __init__(self, **data: Any):
		super().__init__(**data)
		for key, value_type in (
				('processDate', date), ('windowStart', datetime), ('windowEnd', datetime), ('occurrence', datetime)):
			value = self.__dict__.get(key)
			if isinstance(value, str):
				self.__dict__[key] = value_type.fromisoformat(value)


@runtime_checkable
class TaskAdapter(Protocol):
	name: str
	task_type: TaskType

	def capabilities(self) -> AdapterCapabilities: ...

	def discover(self) -> List[DiscoveredTask]: ...

	def list_recent_runs(self, cursor: SyncCursor, limit: int) -> List[TaskRun]: ...

	def run(self, task: TaskDefinition, principal: PrincipalService, run: TaskRun, params: dict) -> RunHandle: ...

	def set_enabled(self, task: TaskDefinition, enabled: bool) -> None: ...

	def rerun_failed(self, task: TaskDefinition, run: TaskRun) -> RunHandle: ...

	def poll_run(self, handle: RunHandle) -> Optional[TaskRun]: ...
