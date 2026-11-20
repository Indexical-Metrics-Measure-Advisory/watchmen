import unittest
from datetime import datetime

from watchmen_auth import fake_tenant_admin
from watchmen_task_hub.model import AlertEventType, EngineRef, ExecutionMode, TaskAlertRule, TaskDefinition, TaskType
from watchmen_task_hub.service import TaskAlertService

from .memory import MemoryRepository


class RuleRepository(MemoryRepository):
	id_attribute = 'ruleId'

	def find_all(self, tenant_id):
		return [item for item in self.items if item.tenantId == tenant_id]


class EventRepository(MemoryRepository):
	id_attribute = 'alertEventId'

	def find_by_event_key(self, event_key, tenant_id):
		return next((item for item in self.items if item.eventKey == event_key and item.tenantId == tenant_id), None)


class TaskAlertServiceTest(unittest.TestCase):
	def test_event_key_throttles_duplicate_alerts(self):
		principal = fake_tenant_admin('tenant-1')
		rules = RuleRepository()
		events = EventRepository()
		service = TaskAlertService(rules, events, principal)
		service.create_rule(TaskAlertRule(name='Failure', eventType=AlertEventType.RUN_FAILED, throttleMinutes=30))
		task = TaskDefinition(
			taskId='task-1', name='Metric', taskType=TaskType.MATERIALIZATION,
			executionMode=ExecutionMode.SCHEDULED, engineRef=EngineRef(kind='metricflow', id='metric-1'),
			tenantId='tenant-1')
		now = datetime(2026, 11, 2, 2, 0)
		first = service.emit(AlertEventType.RUN_FAILED, task, None, {'reason': 'failed'}, now)
		second = service.emit(AlertEventType.RUN_FAILED, task, None, {'reason': 'failed'}, now)
		self.assertEqual(first[0].alertEventId, second[0].alertEventId)
		self.assertEqual(1, len(events.items))


if __name__ == '__main__':
	unittest.main()
