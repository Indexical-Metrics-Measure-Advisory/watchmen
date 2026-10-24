import asyncio
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, Mock, patch

from watchmen_collector_kernel.model import Status
from watchmen_collector_surface.cdc.record_to_json import RecordToJsonService
from watchmen_collector_surface.task.task_listener import TaskListener


class ArchiveConsistencyTest(TestCase):
	def build_record(self, record_id: int, tenant_id: str = 'tenant-1') -> SimpleNamespace:
		return SimpleNamespace(
			changeRecordId=record_id,
			tenantId=tenant_id,
			isMerged=False,
			status=Status.EXECUTING.value,
			result={}
		)

	@patch('watchmen_collector_surface.cdc.record_to_json.ask_record_batch_build_enabled', return_value=True)
	def test_build_json_pairs_separates_same_name_configs_across_tenants(self, _):
		service = RecordToJsonService.__new__(RecordToJsonService)
		service.data_capture_service = Mock()
		service.get_change_data_json = Mock(side_effect=lambda record, *_: record.changeRecordId)
		first_record = self.build_record(1, 'tenant-1')
		second_record = self.build_record(2, 'tenant-2')
		first_config = SimpleNamespace(name='orders', configId='config-1', tenantId='tenant-1')
		second_config = SimpleNamespace(name='orders', configId='config-2', tenantId='tenant-2')

		pairs = service.build_json_pairs([
			(first_record, first_config, {'id': 1}),
			(second_record, second_config, {'id': 2})
		])

		self.assertEqual(2, service.data_capture_service.build_jsons.call_count)
		service.data_capture_service.build_jsons.assert_any_call(first_config, [{'id': 1}])
		service.data_capture_service.build_jsons.assert_any_call(second_config, [{'id': 2}])
		self.assertEqual([(first_record, 1), (second_record, 2)], pairs)

	@patch('watchmen_collector_surface.cdc.record_to_json.ask_listener_time_budget_seconds', return_value=60)
	def test_unarchived_record_is_compensated_without_deleting_source(self, _):
		service = RecordToJsonService.__new__(RecordToJsonService)
		record = self.build_record(1)
		service.find_records_and_locked = Mock(side_effect=[[record], []])
		service.finalize = Mock()
		service.performance_result = Mock()
		service.update_result = Mock(side_effect=RuntimeError('archive failed'))

		def fail_archive(records, *_):
			records[0].status = Status.SUCCESS.value
			raise RuntimeError('archive failed')

		service.process_records = Mock(side_effect=fail_archive)
		service.change_data_record_listener()

		service.update_result.assert_called_once()
		self.assertEqual(record, service.update_result.call_args.args[0])
		service.finalize.assert_not_called()
		service.performance_result.assert_not_called()

	def test_row_by_row_tracks_only_records_whose_archive_committed(self):
		service = RecordToJsonService.__new__(RecordToJsonService)
		service.change_record_service = Mock()
		service.change_record_history_service = Mock()
		service.change_json_service = Mock()
		first_record = self.build_record(1)
		second_record = self.build_record(2)
		first_record.status = Status.SUCCESS.value
		second_record.status = Status.SUCCESS.value
		deleted_ids = []
		service.change_record_service.delete.side_effect = deleted_ids.append

		def commit():
			if deleted_ids[-1] == 2:
				raise RuntimeError('Deadlock found when trying to get lock')

		service.change_record_service.commit_transaction.side_effect = commit
		archived_record_ids = set()

		with self.assertRaisesRegex(RuntimeError, 'Deadlock'):
			service.finish_and_backup_records_row_by_row([
				(first_record, None),
				(second_record, None)
			], archived_record_ids)

		self.assertEqual({1}, archived_record_ids)

	def test_task_archive_failure_compensates_executed_json(self):
		service = TaskListener.__new__(TaskListener)
		change_json = SimpleNamespace(changeJsonId=11, resourceId='resource-1', content={})
		task = SimpleNamespace(changeJsonIds=[11], status=Status.EXECUTING.value)
		service.change_json_service = Mock()
		service.change_json_service.find_json_by_ids.return_value = [change_json]
		service.change_json_history_service = Mock()
		service.change_json_history_service.find_existing_resource_ids.return_value = []
		service.process_sub_tasks = AsyncMock()
		service.archive_task_jsons = Mock(side_effect=RuntimeError('archive failed'))
		service.handle_unfinished_change_json = Mock()
		service.update_task_status = Mock()

		asyncio.run(service.process_task_with_change_data_json(task))

		service.handle_unfinished_change_json.assert_called_once_with([11])
