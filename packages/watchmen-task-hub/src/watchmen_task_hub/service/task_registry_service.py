from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import DataPage, Pageable

from ..meta.common import value_of
from ..meta.task_meta_service import TaskDefinitionService, TaskResourceRefService
from ..model.task import ExecutionMode, RefRole, RefType, TaskDefinition, TaskDefinitionId, TaskResourceRef, TaskType
from .exceptions import TaskAccessDeniedException, TaskConflictException, TaskNotFoundException, TaskValidationException
from .schedule_service import TaskScheduleService


class TaskRegistryService:
	def __init__(
			self, task_service: TaskDefinitionService, ref_service: TaskResourceRefService,
			principal_service: PrincipalService, schedule_service: Optional[TaskScheduleService] = None
	):
		self.task_service = task_service
		self.ref_service = ref_service
		self.principal_service = principal_service
		self.schedule_service = schedule_service or TaskScheduleService()

	def require_admin(self) -> None:
		if not self.principal_service.is_admin():
			raise TaskAccessDeniedException('Task Hub write operations require ADMIN or SUPER_ADMIN.')

	def get_task(self, task_id: TaskDefinitionId) -> TaskDefinition:
		task = self.task_service.find_by_task_id(task_id, self.principal_service.get_tenant_id())
		if task is None:
			raise TaskNotFoundException(f'Task [{task_id}] not found.')
		return task

	def save(self, task: TaskDefinition) -> TaskDefinition:
		self.require_admin()
		try:
			TaskType(value_of(task.taskType))
			ExecutionMode(value_of(task.executionMode))
		except ValueError as e:
			raise TaskValidationException('Unsupported task type or execution mode.') from e
		self.schedule_service.validate_task(task)
		if not task.name or not task.name.strip():
			raise TaskValidationException('Task name is required.')
		if task.engineRef is None or not isinstance(task.engineRef.kind, str) or not isinstance(task.engineRef.id, str) \
				or not task.engineRef.kind.strip() or not task.engineRef.id.strip():
			raise TaskValidationException('engineRef.kind and engineRef.id are required.')
		if task.dependencyWaitTimeoutMinutes < 1 or (
				task.freshnessSlaMinutes is not None and task.freshnessSlaMinutes < 1):
			raise TaskValidationException('Task dependency wait and freshness values are invalid.')
		if task.callback.enabled:
			from urllib.parse import urlparse
			from ..model.run import TaskRunStatus
			parsed_url = urlparse(task.callback.url or '')
			if parsed_url.scheme not in ('http', 'https') or not parsed_url.netloc:
				raise TaskValidationException('A valid HTTP(S) callback URL is required.')
			valid_events = {status.value for status in TaskRunStatus}
			if not task.callback.events or any(event not in valid_events for event in task.callback.events):
				raise TaskValidationException('Callback events must contain valid run statuses.')
		task.tenantId = self.principal_service.get_tenant_id()
		found = self.task_service.find_by_engine(task.engineRef.kind, task.engineRef.id, task.tenantId)
		if found is not None and found.taskId != task.taskId:
			raise TaskConflictException('The engine task is already registered.')
		if task.taskId is None:
			self.task_service.redress_storable_id(task)
			return self.task_service.create(task)
		self.get_task(task.taskId)
		return self.task_service.update(task)

	def replace_refs(self, task_id: TaskDefinitionId, refs: List[TaskResourceRef]) -> List[TaskResourceRef]:
		self.require_admin()
		self.get_task(task_id)
		tenant_id = self.principal_service.get_tenant_id()
		identities = set()
		for ref in refs:
			if ref.taskId != task_id:
				raise TaskValidationException('Every resource ref must belong to the given task.')
			try:
				RefType(value_of(ref.refType))
				RefRole(value_of(ref.role))
			except ValueError as e:
				raise TaskValidationException('Unsupported resource ref type or role.') from e
			identity = (value_of(ref.refType), ref.targetId, value_of(ref.role))
			if identity in identities:
				raise TaskValidationException('Duplicate task resource ref.')
			identities.add(identity)
			ref.tenantId = tenant_id
		for existing in self.ref_service.find_by_task_id(task_id, tenant_id):
			self.ref_service.delete(existing.refId)
		for ref in refs:
			self.ref_service.redress_storable_id(ref)
			self.ref_service.create(ref)
		return refs

	def list_refs(self, task_id: TaskDefinitionId) -> List[TaskResourceRef]:
		self.get_task(task_id)
		return self.ref_service.find_by_task_id(task_id, self.principal_service.get_tenant_id())

	def find_page(
			self, keyword: Optional[str], task_type: Optional[TaskType], pageable: Pageable) -> DataPage:
		return self.task_service.find_page(keyword, task_type, self.principal_service.get_tenant_id(), pageable)
