import unittest
from datetime import date, datetime

from watchmen_task_hub.meta.alert_meta_service import TASK_ALERT_EVENT_ENTITY_SHAPER, TASK_ALERT_RULE_ENTITY_SHAPER
from watchmen_task_hub.meta.run_meta_service import TASK_RUN_DEPENDENCY_ENTITY_SHAPER, TASK_RUN_ENTITY_SHAPER
from watchmen_task_hub.meta.sync_meta_service import TASK_JOB_LOCK_ENTITY_SHAPER, TASK_SYNC_STATE_ENTITY_SHAPER
from watchmen_task_hub.meta.task_meta_service import TASK_DEFINITION_ENTITY_SHAPER, TASK_DEPENDENCY_ENTITY_SHAPER, \
	TASK_RESOURCE_REF_ENTITY_SHAPER
from watchmen_task_hub.model import AlertEventType, DependencyCondition, EngineRef, ExecutionMode, RefRole, RefType, \
	ScheduleFrequency, TaskAlertEvent, TaskAlertRule, TaskDefinition, TaskDependency, TaskJobLock, TaskResourceRef, \
	TaskRun, TaskRunDependency, TaskRunStatus, TaskSchedule, TaskSyncState, TaskType, TriggerType


class TaskHubShaperTest(unittest.TestCase):
	def assert_round_trip(self, shaper, entity, id_attribute):
		row = shaper.serialize(entity)
		restored = shaper.deserialize(row)
		self.assertEqual(getattr(entity, id_attribute), getattr(restored, id_attribute))
		self.assertEqual(entity.tenantId, restored.tenantId)
		return restored

	def test_all_nine_entity_shapers_round_trip(self):
		now = datetime(2026, 11, 2, 2, 0)
		task = TaskDefinition(
			taskId='task-1', name='Metric', taskType=TaskType.MATERIALIZATION,
			executionMode=ExecutionMode.SCHEDULED, engineRef=EngineRef(kind='metricflow', id='metric-1'),
			schedule=TaskSchedule(frequency=ScheduleFrequency.CRON, cronExpression='0 2 * * *'), tenantId='tenant-1')
		restored_task = self.assert_round_trip(TASK_DEFINITION_ENTITY_SHAPER, task, 'taskId')
		self.assertEqual('0 2 * * *', restored_task.schedule.cronExpression)
		self.assertEqual('metricflow', restored_task.engineRef.kind)
		ref = TaskResourceRef(
			refId='ref-1', taskId='task-1', refType=RefType.TOPIC, targetId='topic-1', role=RefRole.TARGET,
			tenantId='tenant-1')
		self.assert_round_trip(TASK_RESOURCE_REF_ENTITY_SHAPER, ref, 'refId')
		dependency = TaskDependency(
			dependencyId='dependency-1', upstreamTaskId='task-1', downstreamTaskId='task-2',
			condition=DependencyCondition.ON_SUCCESS, tenantId='tenant-1')
		self.assert_round_trip(TASK_DEPENDENCY_ENTITY_SHAPER, dependency, 'dependencyId')
		run = TaskRun(
			runId='run-1', taskId='task-1', taskType=TaskType.MATERIALIZATION, instanceKey='day:2026-11-02',
			processDate=date(2026, 11, 2), status=TaskRunStatus.RUNNING, triggerType=TriggerType.API,
			idempotencyKey='request-1', engineRunKey='taskhub:run-1', startedAt=now, tenantId='tenant-1')
		restored_run = self.assert_round_trip(TASK_RUN_ENTITY_SHAPER, run, 'runId')
		self.assertEqual(date(2026, 11, 2), restored_run.processDate)
		run_dependency = TaskRunDependency(
			runDependencyId='run-dependency-1', runId='run-1', dependencyId='dependency-1', tenantId='tenant-1')
		self.assert_round_trip(TASK_RUN_DEPENDENCY_ENTITY_SHAPER, run_dependency, 'runDependencyId')
		rule = TaskAlertRule(
			ruleId='rule-1', name='Failure', eventType=AlertEventType.RUN_FAILED, tenantId='tenant-1')
		self.assert_round_trip(TASK_ALERT_RULE_ENTITY_SHAPER, rule, 'ruleId')
		event = TaskAlertEvent(
			alertEventId='event-1', ruleId='rule-1', eventKey='rule-1:task-1:run-1:1', tenantId='tenant-1')
		self.assert_round_trip(TASK_ALERT_EVENT_ENTITY_SHAPER, event, 'alertEventId')
		state = TaskSyncState(syncId='sync-1', adapterName='metricflow', tenantId='tenant-1')
		self.assert_round_trip(TASK_SYNC_STATE_ENTITY_SHAPER, state, 'syncId')
		lock = TaskJobLock(
			lockId='lock-1', taskId='task-1', instanceKey='day:2026-11-02', runId='run-1', tenantId='tenant-1')
		self.assert_round_trip(TASK_JOB_LOCK_ENTITY_SHAPER, lock, 'lockId')


if __name__ == '__main__':
	unittest.main()
