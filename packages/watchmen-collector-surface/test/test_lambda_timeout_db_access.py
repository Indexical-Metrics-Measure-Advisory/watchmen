from datetime import datetime
from types import SimpleNamespace
from unittest import TestCase, skipIf
from unittest.mock import Mock

from watchmen_collector_kernel.storage import ChangeDataJsonService, ChangeDataRecordService, ScheduledTaskService

try:
	from watchmen_serverless_lambda.service.clean.clean_waiting_timeout import clean_json_waiting_timeout
except ModuleNotFoundError as e:
	if e.name != 'watchmen_serverless_lambda':
		raise
	clean_json_waiting_timeout = None


class LambdaTimeoutDBAccessTest(TestCase):
	def build_service(self, service_class):
		service = service_class.__new__(service_class)
		service.storage = Mock()
		service.storage.find_limited.return_value = []
		return service

	def test_executing_timeout_scans_project_only_ids(self):
		query_time = datetime(2026, 1, 2)
		checks = [
			(ChangeDataRecordService, 'find_records_by_timeout', ['change_record_id']),
			(ChangeDataJsonService, 'find_jsons_by_timeout', ['change_json_id']),
			(ScheduledTaskService, 'find_tasks_by_timeout', ['task_id'])
		]
		for service_class, method_name, id_columns in checks:
			with self.subTest(service=service_class.__name__):
				service = self.build_service(service_class)
				getattr(service, method_name)('tenant-1', query_time, 1)
				finder = service.storage.find_limited.call_args.args[0]
				self.assertEqual(id_columns, finder.columns)

	def test_waiting_timeout_scan_keeps_full_json_for_history(self):
		service = self.build_service(ChangeDataJsonService)
		service.find_jsons_by_timeout('tenant-1', datetime(2026, 1, 2), 4)
		finder = service.storage.find_limited.call_args.args[0]
		self.assertIsNone(finder.columns)

	def test_existing_task_ids_are_projected_and_chunked(self):
		service = ScheduledTaskService.__new__(ScheduledTaskService)
		service.storage = Mock()
		service.storage.find_straight_values.side_effect = [
			[{'task_id': 1}], [{'task_id': 501}], []
		]

		result = service.find_existing_task_ids(list(range(1200)))

		self.assertEqual([1, 501], result)
		self.assertEqual(3, service.storage.find_straight_values.call_count)
		self.assertEqual(1, service.storage.connect.call_count)
		self.assertEqual(1, service.storage.close.call_count)
		for call in service.storage.find_straight_values.call_args_list:
			self.assertEqual(['task_id'], [
				column.columnName for column in call.args[0].straightColumns
			])

	@skipIf(clean_json_waiting_timeout is None, 'watchmen-serverless-lambda is not installed')
	def test_waiting_cleanup_checks_task_existence_in_one_batch(self):
		change_json_service = Mock()
		change_json_history_service = Mock()
		scheduled_task_service = Mock()
		existing = SimpleNamespace(changeJsonId=1, taskId=10, status=4)
		missing = SimpleNamespace(changeJsonId=2, taskId=11, status=4)
		change_json_service.find_jsons_by_timeout.return_value = [existing, missing]
		scheduled_task_service.find_existing_task_ids.return_value = [10]

		clean_json_waiting_timeout(
			'tenant-1', change_json_service, change_json_history_service, scheduled_task_service, 60)

		scheduled_task_service.find_existing_task_ids.assert_called_once_with([10, 11])
		scheduled_task_service.find_task_by_id.assert_not_called()
		change_json_history_service.create.assert_called_once_with(missing)
		change_json_service.delete.assert_called_once_with(2)
		change_json_history_service.commit_transaction.assert_called_once_with()
