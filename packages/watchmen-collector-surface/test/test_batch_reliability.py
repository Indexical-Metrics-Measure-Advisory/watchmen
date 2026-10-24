from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from watchmen_collector_kernel.model import Status
from watchmen_collector_kernel.service.storage_helper import is_retryable_storage_error
from watchmen_collector_kernel.storage import ChangeDataJsonService, ChangeDataRecordService, ScheduledTaskService
from watchmen_collector_surface.cdc.post_json import ModelExecutor
from watchmen_collector_surface.task.clean_of_timeout import CleanOfTimeout


class BatchReliabilityTest(TestCase):
	def test_post_jsons_writes_task_id_before_commit(self):
		service = ModelExecutor.__new__(ModelExecutor)
		service.scheduled_task_service = Mock()
		service.change_json_service = Mock()
		task = SimpleNamespace(taskId=101)
		change_json = SimpleNamespace(changeJsonId=11, isPosted=False, status=0, taskId=None)
		events = []
		service.change_json_service.update_by_ids.side_effect = lambda *args: events.append('update')
		service.scheduled_task_service.commit_transaction.side_effect = lambda: events.append('commit')

		service.post_jsons([task], [change_json])

		self.assertEqual(101, change_json.taskId)
		service.change_json_service.update_by_ids.assert_any_call([11], {'task_id': 101})
		self.assertLess(events.index('update'), events.index('commit'))

	@patch('watchmen_collector_surface.cdc.post_json.ask_listener_time_budget_seconds', return_value=0)
	def test_post_json_honors_time_budget(self, _):
		service = ModelExecutor.__new__(ModelExecutor)
		service.find_json_and_locked = Mock(return_value=[SimpleNamespace()])
		service.distribute_jsons = Mock()

		service.process_model(SimpleNamespace(), SimpleNamespace(modelTriggerId=1), SimpleNamespace())

		service.find_json_and_locked.assert_called_once_with(1)
		service.distribute_jsons.assert_called_once()

	def assert_timeout_reset(self, method_name, service_attribute, id_attribute):
		cleaner = CleanOfTimeout.__new__(CleanOfTimeout)
		cleaner.timeout = 60
		storage_service = Mock()
		setattr(cleaner, service_attribute, storage_service)
		getattr(storage_service, method_name).return_value = [SimpleNamespace(**{id_attribute: 11})]

		if service_attribute == 'change_data_record_service':
			cleaner.clean_record()
		else:
			cleaner.clean_json()

		storage_service.begin_transaction.assert_called_once_with()
		storage_service.update_by_ids.assert_called_once()
		storage_service.commit_transaction.assert_called_once_with()
		storage_service.close_transaction.assert_called_once_with()

	def test_record_timeout_reset_owns_transaction(self):
		self.assert_timeout_reset('find_timeout_record', 'change_data_record_service', 'changeRecordId')

	def test_json_timeout_reset_owns_transaction(self):
		self.assert_timeout_reset('find_timeout_json', 'change_data_json_service', 'changeJsonId')

	def test_bulk_id_operations_are_chunked(self):
		ids = list(range(1200))
		for service_class in (ChangeDataRecordService, ChangeDataJsonService, ScheduledTaskService):
			with self.subTest(service=service_class.__name__):
				service = service_class.__new__(service_class)
				service.storage = Mock()
				service.storage.update.return_value = 1
				service.storage.delete.return_value = 1
				service.update_by_ids(ids, {'status': 0})
				service.delete_by_ids(ids)
				self.assertEqual(3, service.storage.update.call_count)
				self.assertEqual(3, service.storage.delete.call_count)
				self.assertEqual([500, 500, 200], [
					len(call.args[0].criteria[0].right) for call in service.storage.update.call_args_list
				])

	def test_retryable_error_does_not_match_arbitrary_error_number_text(self):
		self.assertFalse(is_retryable_storage_error(RuntimeError('invalid value 1213 for business key')))
		self.assertTrue(is_retryable_storage_error(RuntimeError('Deadlock found when trying to get lock')))
