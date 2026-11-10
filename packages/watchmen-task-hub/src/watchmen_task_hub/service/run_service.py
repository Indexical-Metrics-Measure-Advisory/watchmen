import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_utilities import get_current_time_in_seconds, is_not_blank

from ..meta.common import value_of
from ..meta.run_meta_service import TaskRunDependencyService, TaskRunService
from ..meta.sync_meta_service import TaskJobLockService
from ..meta.task_meta_service import TaskDefinitionService, TaskDependencyService
from ..model.adapter import RunHandle, RunRequest, TaskAdapter
from ..model.run import RunDependencyState, TaskRun, TaskRunDependency, TaskRunId, TaskRunStatus, \
	TERMINAL_RUN_STATUSES, TriggerType
from ..model.sync import TaskJobLock
from ..model.task import DependencyAdoptionStatus, DependencyCondition, TaskDefinitionId, TaskDependency, \
	UpstreamInstancePolicy
from .callback_service import TaskCallbackNotifier
from .exceptions import TaskAccessDeniedException, TaskCapabilityException, TaskConflictException, TaskNotFoundException, \
	TaskValidationException
from .schedule_service import TaskScheduleService

logger = logging.getLogger(__name__)


class TaskRunOrchestrationService:
	def __init__(
			self, run_service: TaskRunService, run_dependency_service: TaskRunDependencyService,
			task_service: TaskDefinitionService, dependency_service: TaskDependencyService,
			lock_service: TaskJobLockService, principal_service: PrincipalService,
			schedule_service: Optional[TaskScheduleService] = None, node_id: Optional[str] = None,
			callback_notifier: Optional[TaskCallbackNotifier] = None
	):
		self.run_service = run_service
		self.run_dependency_service = run_dependency_service
		self.task_service = task_service
		self.dependency_service = dependency_service
		self.lock_service = lock_service
		self.principal_service = principal_service
		self.schedule_service = schedule_service or TaskScheduleService()
		self.node_id = node_id
		self.callback_notifier = callback_notifier

	def get_task(self, task_id: TaskDefinitionId):
		task = self.task_service.find_by_task_id(task_id, self.principal_service.get_tenant_id())
		if task is None:
			raise TaskNotFoundException(f'Task [{task_id}] not found.')
		return task

	def get_run(self, run_id: TaskRunId) -> TaskRun:
		run = self.run_service.find_by_run_id(run_id, self.principal_service.get_tenant_id())
		if run is None:
			raise TaskNotFoundException(f'Run [{run_id}] not found.')
		return run

	def notify_callback(self, run: TaskRun) -> None:
		if self.callback_notifier is None:
			return
		try:
			self.callback_notifier.notify(self.get_task(run.taskId), run)
		except Exception as e:
			logger.warning('Task callback delivery failed for run [%s]: %s', run.runId, str(e))

	def trigger(
			self, task_id: TaskDefinitionId, request: RunRequest, trigger_type: TriggerType = TriggerType.API,
			scheduled_fire_time: Optional[datetime] = None
	) -> TaskRun:
		task = self.get_task(task_id)
		if not task.enabled:
			raise TaskConflictException(f'Task [{task_id}] is disabled.')
		if trigger_type == TriggerType.API and not task.externalTrigger.enabled:
			raise TaskConflictException(f'External triggering is disabled for task [{task_id}].')
		if request.bypassDependencies and not self.principal_service.is_admin():
			raise TaskAccessDeniedException('Bypassing dependencies requires ADMIN or SUPER_ADMIN.')
		tenant_id = self.principal_service.get_tenant_id()
		if trigger_type == TriggerType.API and not is_not_blank(request.idempotencyKey):
			raise TaskValidationException('Idempotency-Key is required for API triggers.')
		idempotency_key = request.idempotencyKey or str(self.run_service.snowflakeGenerator.next_id())
		request_hash = self.schedule_service.request_hash(request)
		existing = self.run_service.find_by_idempotency_key(task_id, idempotency_key, tenant_id)
		if existing is not None:
			if existing.requestHash != request_hash:
				raise TaskConflictException('The idempotency key was already used with a different request.')
			return existing
		instance_key, process_date = self.schedule_service.build_instance_key(request, task, scheduled_fire_time)
		existing = self.run_service.find_latest_attempt(task_id, instance_key, tenant_id)
		if existing is not None:
			return existing
		run_id = str(self.run_service.snowflakeGenerator.next_id())
		lock = TaskJobLock(
			taskId=task_id, instanceKey=instance_key, attempt=0, runId=run_id, tenantId=tenant_id,
			ownerId=self.node_id)
		self.lock_service.acquire(lock)
		run = TaskRun(
			runId=run_id, taskId=task_id, taskType=task.taskType, instanceKey=instance_key, attempt=0,
			processDate=process_date, windowStart=request.windowStart, windowEnd=request.windowEnd,
			status=TaskRunStatus.PENDING if request.bypassDependencies else TaskRunStatus.WAITING,
			triggerType=trigger_type, bypassDependencies=request.bypassDependencies,
			idempotencyKey=idempotency_key, requestHash=request_hash, engineRunKey=f'taskhub:{run_id}',
			resultRefs={}, triggeredBy=self.principal_service.get_user_id(), tenantId=tenant_id)
		self.run_service.create(run)
		initial_status = value_of(run.status)
		if not request.bypassDependencies:
			run = self.evaluate_dependencies(run)
		if value_of(run.status) == initial_status:
			self.notify_callback(run)
		return run

	def active_dependencies(self, task_id: TaskDefinitionId) -> List[TaskDependency]:
		tenant_id = self.principal_service.get_tenant_id()
		return [
			dependency for dependency in self.dependency_service.find_by_downstream(task_id, tenant_id)
			if dependency.enabled and value_of(dependency.adoptionStatus) == DependencyAdoptionStatus.ACCEPTED.value
		]

	def select_upstream_run(self, run: TaskRun, dependency: TaskDependency) -> Optional[TaskRun]:
		if run.processDate is None:
			return None
		aligned_date = run.processDate - timedelta(days=dependency.offsetDays)
		candidates = self.run_service.find_by_process_date(
			dependency.upstreamTaskId, aligned_date, self.principal_service.get_tenant_id())
		if value_of(dependency.instancePolicy) == UpstreamInstancePolicy.SAME_WINDOW.value:
			if run.windowStart is None or run.windowEnd is None:
				return None
			candidates = [
				candidate for candidate in candidates
				if candidate.windowStart == run.windowStart and candidate.windowEnd == run.windowEnd
			]
		if not candidates:
			return None
		return max(candidates, key=lambda candidate: (candidate.createdAt or datetime.min, candidate.runId or ''))

	def evaluate_condition(self, dependency: TaskDependency, upstream: Optional[TaskRun]) -> tuple[str, str]:
		if upstream is None:
			return RunDependencyState.WAITING.value, 'No aligned upstream run exists.'
		status = value_of(upstream.status)
		condition = value_of(dependency.condition)
		if condition == DependencyCondition.ON_SUCCESS.value:
			if status == TaskRunStatus.SUCCESS.value:
				return RunDependencyState.SATISFIED.value, 'Upstream succeeded.'
			if status in TERMINAL_RUN_STATUSES:
				return RunDependencyState.VIOLATED.value, f'Upstream ended as {status}; SUCCESS is required.'
		elif condition == DependencyCondition.ON_FAILURE.value:
			if status == TaskRunStatus.FAILED.value:
				return RunDependencyState.SATISFIED.value, 'Upstream failed as required.'
			if status in TERMINAL_RUN_STATUSES:
				return RunDependencyState.VIOLATED.value, f'Upstream ended as {status}; FAILURE is required.'
		elif condition == DependencyCondition.ON_FINISH.value and status in TERMINAL_RUN_STATUSES:
			return RunDependencyState.SATISFIED.value, f'Upstream finished as {status}.'
		return RunDependencyState.WAITING.value, f'Upstream run is {status}.'

	def evaluate_dependencies(self, run: TaskRun) -> TaskRun:
		if value_of(run.status) not in (TaskRunStatus.WAITING.value, TaskRunStatus.PENDING.value):
			return run
		if run.bypassDependencies:
			return self.transition(run, TaskRunStatus.PENDING)
		dependencies = self.active_dependencies(run.taskId)
		existing = {
			item.dependencyId: item for item in self.run_dependency_service.find_by_run_id(run.runId, run.tenantId)
		}
		states = []
		now = get_current_time_in_seconds()
		for dependency in dependencies:
			upstream = self.select_upstream_run(run, dependency)
			state, reason = self.evaluate_condition(dependency, upstream)
			snapshot = existing.get(dependency.dependencyId) or TaskRunDependency(
				runId=run.runId, dependencyId=dependency.dependencyId, tenantId=run.tenantId)
			snapshot.upstreamRunId = upstream.runId if upstream is not None else None
			snapshot.state = state
			snapshot.reason = reason
			snapshot.evaluatedAt = now
			if snapshot.runDependencyId is None:
				self.run_dependency_service.redress_storable_id(snapshot)
				self.run_dependency_service.create(snapshot)
			else:
				self.run_dependency_service.update(snapshot)
			states.append(state)
		if RunDependencyState.VIOLATED.value in states:
			return self.transition(run, TaskRunStatus.SKIPPED)
		if RunDependencyState.WAITING.value in states:
			return self.transition(run, TaskRunStatus.WAITING)
		return self.transition(run, TaskRunStatus.PENDING)

	def reevaluate_waiting(self) -> List[TaskRun]:
		return [
			self.evaluate_dependencies(run)
			for run in self.run_service.find_waiting(self.principal_service.get_tenant_id())
		]

	def transition(
			self, run: TaskRun, status: TaskRunStatus, error_code: Optional[str] = None,
			error_message: Optional[str] = None, result_refs: Optional[Dict] = None) -> TaskRun:
		current = value_of(run.status)
		target = value_of(status)
		if current == target:
			return run
		allowed = {
			TaskRunStatus.WAITING.value: {
				TaskRunStatus.PENDING.value, TaskRunStatus.RUNNING.value,
				TaskRunStatus.SKIPPED.value, TaskRunStatus.CANCELLED.value},
			TaskRunStatus.PENDING.value: {TaskRunStatus.RUNNING.value, *TERMINAL_RUN_STATUSES},
			TaskRunStatus.RUNNING.value: TERMINAL_RUN_STATUSES
		}
		if target not in allowed.get(current, set()):
			raise TaskConflictException(f'Illegal run status transition: {current} -> {target}.')
		now = get_current_time_in_seconds()
		if target == TaskRunStatus.RUNNING.value and run.startedAt is None:
			run.startedAt = now
		if target in TERMINAL_RUN_STATUSES:
			run.finishedAt = now
			if run.startedAt is not None:
				run.durationMs = max(0, int((now - run.startedAt).total_seconds() * 1000))
		run.status = target
		run.errorCode = error_code
		run.errorMessage = error_message[:2000] if error_message is not None else None
		if result_refs is not None:
			run.resultRefs = result_refs
		run = self.run_service.update(run)
		self.notify_callback(run)
		return run

	def dispatch(self, run_id: TaskRunId, adapter: TaskAdapter, params: Optional[dict] = None) -> TaskRun:
		run = self.get_run(run_id)
		if value_of(run.status) != TaskRunStatus.PENDING.value:
			return run
		task = self.get_task(run.taskId)
		if not task.enabled:
			raise TaskConflictException(f'Task [{task.taskId}] is disabled.')
		if adapter.task_type != task.taskType or not adapter.capabilities().run:
			raise TaskCapabilityException(f'Adapter [{adapter.name}] cannot run task [{task.taskId}].')
		run = self.transition(run, TaskRunStatus.RUNNING)
		try:
			handle = adapter.run(task, self.principal_service, run, params or {})
			return self.bind_handle(run, handle)
		except Exception as e:
			self.transition(run, TaskRunStatus.STALE, error_code='DISPATCH_UNCERTAIN', error_message=str(e))
			raise TaskConflictException('Engine dispatch outcome is uncertain; the run was marked STALE.') from e

	def bind_handle(self, run: TaskRun, handle: RunHandle) -> TaskRun:
		if not is_not_blank(handle.engineRunKey):
			raise TaskValidationException('The engine returned an empty run key.')
		existing = self.run_service.find_by_engine_run_key(run.taskId, handle.engineRunKey, run.tenantId)
		if existing is not None and existing.runId != run.runId:
			raise TaskConflictException(f'Engine run key [{handle.engineRunKey}] is already bound.')
		run.engineRunKey = handle.engineRunKey
		run.executionTarget = handle.executionTarget
		run.resultRefs = handle.resultRefs or {}
		return self.run_service.update(run)

	def rerun(
			self, run_id: TaskRunId, request: Optional[RunRequest] = None,
			trigger_type: TriggerType = TriggerType.MANUAL) -> TaskRun:
		previous = self.get_run(run_id)
		if value_of(previous.status) not in TERMINAL_RUN_STATUSES:
			raise TaskConflictException('Only a terminal run can be rerun.')
		request = request or RunRequest(processDate=previous.processDate)
		if request.bypassDependencies and not self.principal_service.is_admin():
			raise TaskAccessDeniedException('Bypassing dependencies requires ADMIN or SUPER_ADMIN.')
		latest = self.run_service.find_latest_attempt(previous.taskId, previous.instanceKey, previous.tenantId)
		attempt = (latest.attempt if latest is not None else previous.attempt) + 1
		new_run_id = str(self.run_service.snowflakeGenerator.next_id())
		self.lock_service.acquire(TaskJobLock(
			taskId=previous.taskId, instanceKey=previous.instanceKey, attempt=attempt,
			runId=new_run_id, tenantId=previous.tenantId, ownerId=self.node_id))
		bypass = request.bypassDependencies
		new_run = TaskRun(
			runId=new_run_id, taskId=previous.taskId, taskType=previous.taskType,
			instanceKey=previous.instanceKey, attempt=attempt, retryOfRunId=previous.runId,
			processDate=previous.processDate, windowStart=previous.windowStart, windowEnd=previous.windowEnd,
			status=TaskRunStatus.PENDING if bypass else TaskRunStatus.WAITING,
			triggerType=trigger_type, bypassDependencies=bypass,
			idempotencyKey=request.idempotencyKey or str(self.run_service.snowflakeGenerator.next_id()),
			requestHash=self.schedule_service.request_hash(request), engineRunKey=f'taskhub:{new_run_id}',
			resultRefs={}, triggeredBy=self.principal_service.get_user_id(), tenantId=previous.tenantId)
		self.run_service.create(new_run)
		initial_status = value_of(new_run.status)
		if not bypass:
			new_run = self.evaluate_dependencies(new_run)
		if value_of(new_run.status) == initial_status:
			self.notify_callback(new_run)
		return new_run

	def all_dependencies_satisfied(self, run: TaskRun) -> bool:
		for dependency in self.active_dependencies(run.taskId):
			upstream = self.select_upstream_run(run, dependency)
			state, _ = self.evaluate_condition(dependency, upstream)
			if state != RunDependencyState.SATISFIED.value:
				return False
		return True

	def recover_skipped_downstream(self, upstream_run: TaskRun) -> List[TaskRun]:
		if value_of(upstream_run.status) not in TERMINAL_RUN_STATUSES or upstream_run.processDate is None:
			return []
		tenant_id = self.principal_service.get_tenant_id()
		recovered = []
		for dependency in self.dependency_service.find_by_upstream(upstream_run.taskId, tenant_id):
			if not dependency.enabled or value_of(dependency.adoptionStatus) != DependencyAdoptionStatus.ACCEPTED.value:
				continue
			process_date = upstream_run.processDate + timedelta(days=dependency.offsetDays)
			candidates = self.run_service.find_by_process_date(dependency.downstreamTaskId, process_date, tenant_id)
			if value_of(dependency.instancePolicy) == UpstreamInstancePolicy.SAME_WINDOW.value:
				candidates = [
					run for run in candidates
					if run.windowStart == upstream_run.windowStart and run.windowEnd == upstream_run.windowEnd
				]
			latest_by_instance = {}
			for candidate in candidates:
				current = latest_by_instance.get(candidate.instanceKey)
				if current is None or candidate.attempt > current.attempt:
					latest_by_instance[candidate.instanceKey] = candidate
			for candidate in latest_by_instance.values():
				if value_of(candidate.status) == TaskRunStatus.SKIPPED.value and self.all_dependencies_satisfied(candidate):
					recovered.append(self.rerun(candidate.runId, trigger_type=TriggerType.DEPENDENCY))
		return recovered

	def skip_timed_out_waiting(self, now: Optional[datetime] = None) -> List[TaskRun]:
		moment = now or get_current_time_in_seconds()
		timed_out = []
		for run in self.run_service.find_waiting(self.principal_service.get_tenant_id()):
			if run.createdAt is None:
				continue
			task = self.get_task(run.taskId)
			if run.createdAt + timedelta(minutes=task.dependencyWaitTimeoutMinutes) <= moment:
				timed_out.append(self.transition(
					run, TaskRunStatus.SKIPPED, error_code='DEPENDENCY_WAIT_TIMEOUT',
					error_message='Dependency wait deadline exceeded.'))
		return timed_out
