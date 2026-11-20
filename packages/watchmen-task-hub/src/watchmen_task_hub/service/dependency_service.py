from typing import Dict, List, Optional, Set, Tuple

from watchmen_auth import PrincipalService

from ..meta.common import value_of
from ..meta.task_meta_service import TaskDefinitionService, TaskDependencyService, TaskResourceRefService
from ..model.task import DependencyAdoptionStatus, DependencyKind, RefRole, TaskDependency, TaskDependencyId, \
	TaskDefinitionId, TaskType
from .exceptions import TaskAccessDeniedException, TaskConflictException, TaskNotFoundException, TaskValidationException


class TaskDependencyOrchestrationService:
	def __init__(
			self, dependency_service: TaskDependencyService, task_service: TaskDefinitionService,
			ref_service: TaskResourceRefService, principal_service: PrincipalService
	):
		self.dependency_service = dependency_service
		self.task_service = task_service
		self.ref_service = ref_service
		self.principal_service = principal_service

	def require_admin(self) -> None:
		if not self.principal_service.is_admin():
			raise TaskAccessDeniedException('Dependency changes require ADMIN or SUPER_ADMIN.')

	def get(self, dependency_id: TaskDependencyId) -> TaskDependency:
		tenant_id = self.principal_service.get_tenant_id()
		found = [item for item in self.dependency_service.find_all(tenant_id) if item.dependencyId == dependency_id]
		if not found:
			raise TaskNotFoundException(f'Dependency [{dependency_id}] not found.')
		return found[0]

	def validate_tasks(self, upstream_task_id: TaskDefinitionId, downstream_task_id: TaskDefinitionId) -> None:
		if upstream_task_id == downstream_task_id:
			raise TaskValidationException('A task cannot depend on itself.')
		tenant_id = self.principal_service.get_tenant_id()
		upstream = self.task_service.find_by_task_id(upstream_task_id, tenant_id)
		downstream = self.task_service.find_by_task_id(downstream_task_id, tenant_id)
		if upstream is None or downstream is None:
			raise TaskNotFoundException('Upstream or downstream task not found in the current tenant.')
		if value_of(upstream.taskType) == TaskType.PIPELINE_EVENT.value or value_of(downstream.taskType) == TaskType.PIPELINE_EVENT.value:
			raise TaskValidationException('pipeline_event tasks do not participate in dependency orchestration.')

	def assert_acyclic(self, dependencies: List[TaskDependency]) -> None:
		graph: Dict[str, List[str]] = {}
		for dependency in dependencies:
			if value_of(dependency.adoptionStatus) == DependencyAdoptionStatus.ACCEPTED.value and dependency.enabled:
				graph.setdefault(dependency.upstreamTaskId, []).append(dependency.downstreamTaskId)
		visited: Set[str] = set()
		visiting: Set[str] = set()

		def visit(task_id: str) -> None:
			if task_id in visiting:
				raise TaskConflictException('The dependency would create a cycle.')
			if task_id in visited:
				return
			visiting.add(task_id)
			for downstream_id in graph.get(task_id, []):
				visit(downstream_id)
			visiting.remove(task_id)
			visited.add(task_id)

		for task_id in graph:
			visit(task_id)

	def create(self, dependency: TaskDependency) -> TaskDependency:
		self.require_admin()
		self.validate_tasks(dependency.upstreamTaskId, dependency.downstreamTaskId)
		tenant_id = self.principal_service.get_tenant_id()
		existing = self.dependency_service.find_pair(dependency.upstreamTaskId, dependency.downstreamTaskId, tenant_id)
		if existing is not None:
			existing.kind = DependencyKind.EXPLICIT
			existing.adoptionStatus = DependencyAdoptionStatus.ACCEPTED
			existing.condition = dependency.condition
			existing.instancePolicy = dependency.instancePolicy
			existing.offsetDays = dependency.offsetDays
			existing.enabled = dependency.enabled
			existing.declaredBy = self.principal_service.get_user_id()
			candidate = existing
		else:
			dependency.tenantId = tenant_id
			dependency.kind = DependencyKind.EXPLICIT
			dependency.adoptionStatus = DependencyAdoptionStatus.ACCEPTED
			dependency.declaredBy = self.principal_service.get_user_id()
			dependency.dependencyId = 'pending'
			candidate = dependency
		all_dependencies = self.dependency_service.find_all(tenant_id)
		all_dependencies = [item for item in all_dependencies if item.dependencyId != candidate.dependencyId]
		all_dependencies.append(candidate)
		self.assert_acyclic(all_dependencies)
		if existing is not None:
			return self.dependency_service.update(existing)
		dependency.dependencyId = None
		self.dependency_service.redress_storable_id(dependency)
		return self.dependency_service.create(dependency)

	def adopt(self, dependency_id: TaskDependencyId) -> TaskDependency:
		self.require_admin()
		dependency = self.get(dependency_id)
		dependency.adoptionStatus = DependencyAdoptionStatus.ACCEPTED
		dependency.enabled = True
		dependencies = self.dependency_service.find_all(self.principal_service.get_tenant_id())
		self.assert_acyclic(dependencies)
		return self.dependency_service.update(dependency)

	def reject(self, dependency_id: TaskDependencyId) -> TaskDependency:
		self.require_admin()
		dependency = self.get(dependency_id)
		if value_of(dependency.kind) != DependencyKind.INFERRED_DATA.value:
			raise TaskValidationException('Only inferred dependencies can be rejected.')
		dependency.adoptionStatus = DependencyAdoptionStatus.REJECTED
		dependency.enabled = False
		return self.dependency_service.update(dependency)

	def delete(self, dependency_id: TaskDependencyId) -> None:
		self.require_admin()
		dependency = self.get(dependency_id)
		if value_of(dependency.kind) == DependencyKind.INFERRED_DATA.value:
			dependency.enabled = False
			self.dependency_service.update(dependency)
		else:
			self.dependency_service.delete(dependency_id)

	def preview_inferred(self) -> List[TaskDependency]:
		tenant_id = self.principal_service.get_tenant_id()
		refs = self.ref_service.find_all(tenant_id)
		targets: Dict[Tuple[str, str], Set[str]] = {}
		sources: Dict[Tuple[str, str], Set[str]] = {}
		for ref in refs:
			if ref.unresolved:
				continue
			key = (value_of(ref.refType), ref.targetId)
			if value_of(ref.role) == RefRole.TARGET.value:
				targets.setdefault(key, set()).add(ref.taskId)
			elif value_of(ref.role) == RefRole.SOURCE.value:
				sources.setdefault(key, set()).add(ref.taskId)
		existing = {
			(item.upstreamTaskId, item.downstreamTaskId): item
			for item in self.dependency_service.find_all(tenant_id)
		}
		preview = []
		for asset, upstream_ids in targets.items():
			for downstream_id in sources.get(asset, set()):
				for upstream_id in upstream_ids:
					if upstream_id == downstream_id:
						continue
					pair = (upstream_id, downstream_id)
					if pair in existing:
						preview.append(existing[pair])
					else:
						preview.append(TaskDependency(
							upstreamTaskId=upstream_id, downstreamTaskId=downstream_id,
							kind=DependencyKind.INFERRED_DATA, adoptionStatus=DependencyAdoptionStatus.PROPOSED,
							enabled=False, tenantId=tenant_id))
		valid_preview = []
		for dependency in preview:
			try:
				self.validate_tasks(dependency.upstreamTaskId, dependency.downstreamTaskId)
				valid_preview.append(dependency)
			except TaskValidationException:
				pass
		return valid_preview

	def synchronize_inferred(self) -> List[TaskDependency]:
		self.require_admin()
		tenant_id = self.principal_service.get_tenant_id()
		preview = self.preview_inferred()
		active_pairs = {(item.upstreamTaskId, item.downstreamTaskId) for item in preview}
		existing = self.dependency_service.find_all(tenant_id)
		for dependency in existing:
			pair = (dependency.upstreamTaskId, dependency.downstreamTaskId)
			if value_of(dependency.kind) != DependencyKind.INFERRED_DATA.value:
				continue
			if pair not in active_pairs and dependency.enabled:
				dependency.enabled = False
				self.dependency_service.update(dependency)
		for candidate in preview:
			if candidate.dependencyId is None:
				self.dependency_service.redress_storable_id(candidate)
				self.dependency_service.create(candidate)
		return self.dependency_service.find_all(tenant_id)
