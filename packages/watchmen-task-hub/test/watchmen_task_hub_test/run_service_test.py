import unittest
from datetime import date, datetime, timedelta

from watchmen_auth import fake_tenant_admin
from watchmen_task_hub.model import AdapterCapabilities, DependencyAdoptionStatus, EngineRef, ExecutionMode, RunHandle, \
	RunRequest, TaskDefinition, TaskDependency, TaskRunStatus, TaskType, TriggerType
from watchmen_task_hub.service import TaskConflictException, TaskRunOrchestrationService, TaskValidationException

from .memory import DependencyRepository, LockRepository, RunDependencyRepository, RunRepository, TaskRepository


class RecordingAdapter:
	name = 'recording'
	task_type = TaskType.MATERIALIZATION

	def __init__(self):
		self.calls = []

	def capabilities(self):
		return AdapterCapabilities(run=True)

	def run(self, task, principal, run, params):
		self.calls.append(run.runId)
		return RunHandle(engineRunKey=f'metricflow:engine-{run.runId}', resultRefs={'engine': 'metricflow'})


class RecordingCallbackNotifier:
	def __init__(self):
		self.events = []

	def notify(self, task, run):
		if task.callback.enabled and run.triggerType == TriggerType.API and run.status in task.callback.events:
			self.events.append(run.status)


class TaskRunServiceTest(unittest.TestCase):
	def setUp(self):
		self.principal = fake_tenant_admin('tenant-1')
		self.tasks = TaskRepository()
		self.dependencies = DependencyRepository()
		self.runs = RunRepository()
		self.run_dependencies = RunDependencyRepository()
		self.locks = LockRepository()
		for task_id in ('upstream', 'downstream'):
			self.tasks.create(TaskDefinition(
				taskId=task_id, name=task_id, taskType=TaskType.MATERIALIZATION,
				executionMode=ExecutionMode.SCHEDULED, engineRef=EngineRef(kind='metricflow', id=task_id),
				tenantId='tenant-1', dependencyWaitTimeoutMinutes=60))
		self.dependencies.create(TaskDependency(
			dependencyId='dependency-1', upstreamTaskId='upstream', downstreamTaskId='downstream',
			adoptionStatus=DependencyAdoptionStatus.ACCEPTED, tenantId='tenant-1'))
		self.service = TaskRunOrchestrationService(
			self.runs, self.run_dependencies, self.tasks, self.dependencies, self.locks, self.principal)
		self.request = RunRequest(processDate=date(2026, 11, 2), idempotencyKey='request-1')

	def test_waits_without_calling_engine_then_becomes_ready(self):
		downstream = self.service.trigger('downstream', self.request, TriggerType.API)
		self.assertEqual(TaskRunStatus.WAITING, downstream.status)
		self.assertEqual('WAITING', self.run_dependencies.items[0].state)
		upstream = self.service.trigger('upstream', RunRequest(processDate=date(2026, 11, 2)), TriggerType.MANUAL)
		self.service.transition(upstream, TaskRunStatus.RUNNING)
		self.service.transition(upstream, TaskRunStatus.SUCCESS)
		downstream = self.service.evaluate_dependencies(downstream)
		self.assertEqual(TaskRunStatus.PENDING, downstream.status)
		self.assertEqual(upstream.runId, self.run_dependencies.items[0].upstreamRunId)
		adapter = RecordingAdapter()
		self.service.dispatch(downstream.runId, adapter)
		self.assertEqual([downstream.runId], adapter.calls)
		self.assertTrue(downstream.engineRunKey.startswith('metricflow:'))

	def test_api_idempotency_returns_original_and_rejects_changed_payload(self):
		first = self.service.trigger('downstream', self.request, TriggerType.API)
		second = self.service.trigger('downstream', self.request, TriggerType.API)
		self.assertIs(first, second)
		changed = RunRequest(processDate=date(2026, 11, 2), idempotencyKey='request-1', params={'force': True})
		with self.assertRaises(TaskConflictException):
			self.service.trigger('downstream', changed, TriggerType.API)
		self.assertEqual(1, len(self.runs.items))

	def test_api_requires_idempotency_key(self):
		with self.assertRaises(TaskValidationException):
			self.service.trigger('downstream', RunRequest(processDate=date(2026, 11, 2)), TriggerType.API)

	def test_failed_upstream_skips_and_successful_retry_recovers_new_attempt(self):
		downstream = self.service.trigger('downstream', self.request, TriggerType.API)
		upstream = self.service.trigger('upstream', RunRequest(processDate=date(2026, 11, 2)), TriggerType.MANUAL)
		self.service.transition(upstream, TaskRunStatus.RUNNING)
		self.service.transition(upstream, TaskRunStatus.FAILED)
		downstream = self.service.evaluate_dependencies(downstream)
		self.assertEqual(TaskRunStatus.SKIPPED, downstream.status)
		retry = self.service.rerun(upstream.runId)
		self.service.transition(retry, TaskRunStatus.RUNNING)
		self.service.transition(retry, TaskRunStatus.SUCCESS)
		recovered = self.service.recover_skipped_downstream(retry)
		self.assertEqual(1, len(recovered))
		self.assertEqual(1, recovered[0].attempt)
		self.assertEqual(downstream.runId, recovered[0].retryOfRunId)
		self.assertEqual(TriggerType.DEPENDENCY, recovered[0].triggerType)
		self.assertEqual(TaskRunStatus.PENDING, recovered[0].status)
		self.assertEqual(TaskRunStatus.SKIPPED, downstream.status)

	def test_terminal_status_cannot_reopen(self):
		run = self.service.trigger('upstream', RunRequest(processDate=date(2026, 11, 2)), TriggerType.MANUAL)
		self.service.transition(run, TaskRunStatus.RUNNING)
		self.service.transition(run, TaskRunStatus.SUCCESS)
		with self.assertRaises(TaskConflictException):
			self.service.transition(run, TaskRunStatus.RUNNING)

	def test_external_trigger_can_be_disabled_without_blocking_manual_runs(self):
		task = self.tasks.find_by_task_id('upstream', 'tenant-1')
		task.externalTrigger.enabled = False
		with self.assertRaises(TaskConflictException):
			self.service.trigger('upstream', self.request, TriggerType.API)
		run = self.service.trigger('upstream', RunRequest(processDate=date(2026, 11, 2)), TriggerType.MANUAL)
		self.assertEqual(TaskRunStatus.PENDING, run.status)

	def test_external_run_notifies_each_selected_lifecycle_event_once(self):
		task = self.tasks.find_by_task_id('upstream', 'tenant-1')
		task.callback.enabled = True
		task.callback.url = 'https://example.com/callback'
		task.callback.events = ['PENDING', 'RUNNING', 'SUCCESS']
		notifier = RecordingCallbackNotifier()
		service = TaskRunOrchestrationService(
			self.runs, self.run_dependencies, self.tasks, self.dependencies, self.locks, self.principal,
			callback_notifier=notifier)
		run = service.trigger('upstream', self.request, TriggerType.API)
		service.dispatch(run.runId, RecordingAdapter())
		service.transition(run, TaskRunStatus.SUCCESS)
		self.assertEqual(['PENDING', 'RUNNING', 'SUCCESS'], notifier.events)

	def test_waiting_timeout_is_skipped(self):
		run = self.service.trigger('downstream', self.request, TriggerType.API)
		timed_out = self.service.skip_timed_out_waiting(run.createdAt + timedelta(minutes=61))
		self.assertEqual([run], timed_out)
		self.assertEqual(TaskRunStatus.SKIPPED, run.status)
		self.assertEqual('DEPENDENCY_WAIT_TIMEOUT', run.errorCode)


if __name__ == '__main__':
	unittest.main()
