import hashlib
import unittest
from datetime import date, datetime
from types import SimpleNamespace

from fastapi.testclient import TestClient
from watchmen_auth import fake_tenant_admin
from watchmen_model.common import DataPage
from watchmen_task_hub.model import DependencyAdoptionStatus, EngineRef, ExecutionMode, RefRole, RefType, TaskDefinition, \
	TaskDependency, TaskJobLock, TaskResourceRef, TaskRun, TaskRunStatus, TaskType, TriggerType

from watchmen_rest_task_hub.dependencies import get_services
from watchmen_rest_task_hub.main import app


class FakeStorage:
	def begin(self):
		pass

	def commit_and_close(self):
		pass

	def rollback_and_close(self):
		pass

	def close(self):
		pass


class ApiTest(unittest.TestCase):
	def setUp(self):
		self.principal = fake_tenant_admin('tenant-1')
		self.task = TaskDefinition(
			taskId='task-1', name='Metric', taskType=TaskType.MATERIALIZATION,
			executionMode=ExecutionMode.SCHEDULED, engineRef=EngineRef(kind='metricflow', id='metric-1'),
			tenantId='tenant-1')
		self.ref = TaskResourceRef(
			refId='ref-1', taskId='task-1', refType=RefType.TOPIC, targetId='topic-1', targetName='Metric Topic',
			role=RefRole.TARGET, tenantId='tenant-1')
		self.dependency = TaskDependency(
			dependencyId='dep-1', upstreamTaskId='task-1', downstreamTaskId='task-2',
			adoptionStatus=DependencyAdoptionStatus.ACCEPTED, tenantId='tenant-1')
		self.run = TaskRun(
			runId='run-1', taskId='task-1', taskType=TaskType.MATERIALIZATION, instanceKey='day:2026-11-04',
			processDate=date(2026, 11, 4), status=TaskRunStatus.RUNNING, triggerType=TriggerType.API,
			idempotencyKey='request-1', engineRunKey='taskhub:run-1', callbackTokenHash=hashlib.sha256(b'valid').hexdigest(),
			createdAt=datetime(2026, 11, 4, 2), startedAt=datetime(2026, 11, 4, 2), tenantId='tenant-1')
		self.registry = SimpleNamespace(
			find_page=lambda *args: DataPage(data=[self.task], itemCount=1, pageCount=1, pageNumber=1, pageSize=20),
			get_task=lambda task_id: self.task,
			list_refs=lambda task_id: [self.ref],
			save=lambda task: task)
		self.services = SimpleNamespace(
			storage=FakeStorage(), principal=self.principal, registry=self.registry,
			tasks=SimpleNamespace(find_by_task_id=lambda task_id, tenant_id: self.task, find_all=lambda tenant_id: [self.task]),
			refs=SimpleNamespace(
				find_by_task_id=lambda task_id, tenant_id: [self.ref],
				find_by_asset=lambda kind, ref_id, tenant_id: [self.ref]),
			dependencies=SimpleNamespace(
				find_all=lambda tenant_id: [self.dependency], find_by_id=lambda dependency_id: self.dependency),
			runs=SimpleNamespace(
				find_page=lambda *args: DataPage(data=[self.run], itemCount=1, pageCount=1, pageNumber=1, pageSize=100),
				find_by_process_date=lambda *args: [self.run]),
			locks=SimpleNamespace(find_by_run_id=lambda run_id, tenant_id: TaskJobLock(
				lockId='lock-1', taskId='task-1', instanceKey='day:2026-11-04', runId=run_id, ownerId='node-1',
				expiresAt=None, tenantId='tenant-1')),
			run_dependencies=SimpleNamespace(find_by_run_id=lambda run_id, tenant_id: []),
			run_orchestration=SimpleNamespace(get_run=lambda run_id: self.run),
			sync_states=SimpleNamespace(find_by_adapter=lambda name, tenant_id: None),
			alert_events=SimpleNamespace(find_recent=lambda tenant_id, pageable: DataPage(data=[])))
		app.dependency_overrides[get_services] = lambda: self.services
		self.client = TestClient(app)

	def tearDown(self):
		app.dependency_overrides.clear()

	def test_health(self):
		response = self.client.get('/health')
		self.assertEqual(200, response.status_code)
		self.assertTrue(response.json()['health'])

	def test_task_page_and_detail_contract(self):
		page = self.client.post('/taskhub/tasks/page', json={'pageNumber': 1, 'pageSize': 20})
		self.assertEqual(200, page.status_code)
		self.assertEqual('task-1', page.json()['data'][0]['taskId'])
		detail = self.client.get('/taskhub/tasks/task-1')
		self.assertEqual('topic-1', detail.json()['refs'][0]['targetId'])
		self.assertIn('capabilities', detail.json())
		self.assertTrue(detail.json()['externalTrigger']['enabled'])
		self.assertFalse(detail.json()['callback']['enabled'])

	def test_run_contract_includes_claim_and_dependencies(self):
		response = self.client.get('/taskhub/runs/run-1')
		self.assertEqual(200, response.status_code)
		self.assertEqual('node-1', response.json()['claimedBy'])
		self.assertEqual([], response.json()['dependencies'])
		page = self.client.get('/taskhub/runs')
		self.assertEqual('request-1', page.json()['data'][0]['idempotencyKey'])

	def test_dependency_and_monitoring_contracts(self):
		dependencies = self.client.get('/taskhub/dependencies')
		self.assertEqual('ACCEPTED', dependencies.json()[0]['adoptionStatus'])
		overview = self.client.get('/taskhub/monitor/overview')
		self.assertEqual('CONNECTED', overview.json()['cluster']['sharedStoreStatus'])
		self.assertEqual(7, len(overview.json()['successTrend']))
		self.assertEqual(200, self.client.get('/taskhub/metrics').status_code)

	def test_build_map_and_timeline(self):
		build_map = self.client.post('/taskhub/views/map', json={})
		self.assertEqual(200, build_map.status_code)
		self.assertEqual(['task-1'], build_map.json()['assets'][0]['builderTaskIds'])
		timeline = self.client.get('/taskhub/views/timeline')
		self.assertEqual('task-1', timeline.json()[0]['taskId'])

	def test_run_requires_idempotency_key(self):
		response = self.client.post('/taskhub/tasks/task-1/run', json={'processDate': '2026-11-04'})
		self.assertEqual(400, response.status_code)

	def test_callback_rejects_invalid_token(self):
		response = self.client.post('/taskhub/internal/runs/run-1/callback', json={'status': 'SUCCESS'}, headers={'X-TaskHub-Callback-Token': 'wrong'})
		self.assertEqual(401, response.status_code)


if __name__ == '__main__':
	unittest.main()
