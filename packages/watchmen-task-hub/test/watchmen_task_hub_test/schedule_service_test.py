import unittest
from datetime import date, datetime, timezone

from watchmen_task_hub.model import EngineRef, ExecutionMode, RunRequest, ScheduleFrequency, ScheduleMode, \
	TaskDefinition, TaskSchedule, TaskType
from watchmen_task_hub.service import TaskScheduleService, TaskValidationException


class TaskScheduleServiceTest(unittest.TestCase):
	def setUp(self):
		self.service = TaskScheduleService()
		self.task = TaskDefinition(
			name='Daily metric', taskType=TaskType.MATERIALIZATION, executionMode=ExecutionMode.SCHEDULED,
			engineRef=EngineRef(kind='metricflow', id='metric-1'),
			schedule=TaskSchedule(mode=ScheduleMode.MANAGED, timeOfDay='02:00'))

	def test_supports_structured_frequencies(self):
		for schedule in (
			TaskSchedule(frequency=ScheduleFrequency.DAILY, timeOfDay='02:00'),
			TaskSchedule(frequency=ScheduleFrequency.WEEKLY, timeOfDay='02:00', weekday=1),
			TaskSchedule(frequency=ScheduleFrequency.MONTHLY, timeOfDay='02:00', dayOfMonth=1),
			TaskSchedule(frequency=ScheduleFrequency.INTERVAL, intervalMinutes=30),
			TaskSchedule(frequency=ScheduleFrequency.CRON, cronExpression='0 2 * * *'),
			TaskSchedule(frequency=ScheduleFrequency.EVENT),
			TaskSchedule(frequency=ScheduleFrequency.STREAMING)
		):
			self.service.validate(schedule)

	def test_rejects_incomplete_or_invalid_schedule(self):
		with self.assertRaises(TaskValidationException):
			self.service.validate(TaskSchedule(frequency=ScheduleFrequency.WEEKLY, timeOfDay='02:00'))
		with self.assertRaises(TaskValidationException):
			self.service.validate(TaskSchedule(frequency=ScheduleFrequency.CRON, cronExpression='every day'))
		with self.assertRaises(TaskValidationException):
			self.service.validate(TaskSchedule(timeOfDay='25:00'))
		with self.assertRaises(TaskValidationException):
			self.service.validate(TaskSchedule(timezone='Not/AZone'))

	def test_builds_day_window_occurrence_and_schedule_keys(self):
		request = RunRequest(processDate=date(2026, 11, 2))
		self.assertEqual('day:2026-11-02', self.service.build_instance_key(request, self.task)[0])
		request.windowStart = datetime(2026, 11, 2, tzinfo=timezone.utc)
		request.windowEnd = datetime(2026, 11, 3, tzinfo=timezone.utc)
		self.assertTrue(self.service.build_instance_key(request, self.task)[0].startswith('window:'))
		request = RunRequest(processDate=date(2026, 11, 2), occurrence=datetime(2026, 11, 2, 2, tzinfo=timezone.utc))
		self.assertTrue(self.service.build_instance_key(request, self.task)[0].startswith('occurrence:'))
		key, process_date = self.service.build_instance_key(
			RunRequest(), self.task, datetime(2026, 11, 2, 18, tzinfo=timezone.utc))
		self.assertTrue(key.startswith('schedule:'))
		self.assertEqual(date(2026, 11, 3), process_date)

	def test_requires_explicit_process_date_and_timezone(self):
		with self.assertRaises(TaskValidationException):
			self.service.build_instance_key(RunRequest(), self.task)
		with self.assertRaises(TaskValidationException):
			self.service.build_instance_key(RunRequest(processDate=date(2026, 11, 2), occurrence=datetime(2026, 11, 2)), self.task)

	def test_idempotency_hash_excludes_key_and_is_canonical(self):
		first = RunRequest(processDate=date(2026, 11, 2), params={'b': 2, 'a': 1}, idempotencyKey='one')
		second = RunRequest(processDate=date(2026, 11, 2), params={'a': 1, 'b': 2}, idempotencyKey='two')
		self.assertEqual(self.service.request_hash(first), self.service.request_hash(second))


if __name__ == '__main__':
	unittest.main()
