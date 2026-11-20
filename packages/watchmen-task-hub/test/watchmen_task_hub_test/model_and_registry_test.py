import unittest
from datetime import date, datetime

from watchmen_auth import fake_tenant_admin
from watchmen_task_hub.model import EngineRef, ExecutionMode, RunRequest, TaskDefinition, TaskType
from watchmen_task_hub.service import TaskRegistryService, TaskValidationException

from .memory import RefRepository, TaskRepository


class ModelAndRegistryTest(unittest.TestCase):
	def test_run_request_coerces_iso_dates_from_api_payload(self):
		request = RunRequest(
			processDate='2026-11-02', windowStart='2026-11-02T00:00:00+08:00',
			windowEnd='2026-11-03T00:00:00+08:00')
		self.assertEqual(date(2026, 11, 2), request.processDate)
		self.assertEqual(datetime.fromisoformat('2026-11-02T00:00:00+08:00'), request.windowStart)

	def test_registry_rejects_unsupported_rest_task_type(self):
		tasks = TaskRepository()
		service = TaskRegistryService(tasks, RefRepository(), fake_tenant_admin('tenant-1'))
		task = TaskDefinition(
			name='Arbitrary REST call', taskType='rest_task', executionMode=ExecutionMode.MANUAL,
			engineRef=EngineRef(kind='http', id='custom'))
		with self.assertRaises(TaskValidationException):
			service.save(task)
		self.assertEqual([], tasks.items)

	def test_registry_validates_callback_url_and_events(self):
		tasks = TaskRepository()
		service = TaskRegistryService(tasks, RefRepository(), fake_tenant_admin('tenant-1'))
		task = TaskDefinition(
			name='Invalid callback', taskType=TaskType.MATERIALIZATION, executionMode=ExecutionMode.MANUAL,
			engineRef=EngineRef(kind='metricflow', id='invalid-callback'),
			callback={'enabled': True, 'url': 'file:///tmp/callback', 'events': ['SUCCESS']})
		with self.assertRaises(TaskValidationException):
			service.save(task)
		task.callback.url = 'https://example.com/callback'
		task.callback.events = ['UNKNOWN_STATUS']
		with self.assertRaises(TaskValidationException):
			service.save(task)


if __name__ == '__main__':
	unittest.main()
