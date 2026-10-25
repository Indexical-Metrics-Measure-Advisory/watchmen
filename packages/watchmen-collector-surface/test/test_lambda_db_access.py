from types import SimpleNamespace
from unittest import TestCase, skipIf
from unittest.mock import Mock, call, patch

from watchmen_collector_kernel.service import storage_helper

try:
	from watchmen_serverless_lambda.service.json.json_worker import JSONWorker
except ModuleNotFoundError as e:
	if e.name != 'watchmen_serverless_lambda':
		raise
	JSONWorker = None


@skipIf(JSONWorker is None, 'watchmen-serverless-lambda is not installed')
class LambdaDBAccessTest(TestCase):

	def build_json_worker(self):
		worker = JSONWorker.__new__(JSONWorker)
		worker.change_json_service = Mock()
		worker.change_json_history_service = Mock()
		worker.post_json = Mock()
		worker.update_result = Mock()
		return worker

	def test_single_json_uses_batch_reads_and_preserves_processing_order(self):
		worker = self.build_json_worker()
		first = SimpleNamespace(changeJsonId=3, resourceId='shared', isPosted=False)
		already_archived = SimpleNamespace(changeJsonId=1, resourceId='archived', isPosted=False)
		later_duplicate = SimpleNamespace(changeJsonId=2, resourceId='shared', isPosted=False)
		fresh = SimpleNamespace(changeJsonId=4, resourceId='fresh', isPosted=False)
		worker.change_json_service.find_json_by_ids.return_value = [fresh, later_duplicate, already_archived, first]
		worker.change_json_history_service.find_existing_resource_ids.return_value = ['archived']
		trigger_event = SimpleNamespace()
		model_config = SimpleNamespace()

		worker.process_single_change_data_json(trigger_event, model_config, [3, 1, 2, 4, 5])

		worker.change_json_service.find_json_by_ids.assert_called_once_with([3, 1, 2, 4, 5])
		worker.change_json_service.find_json_by_id.assert_not_called()
		worker.change_json_history_service.find_existing_resource_ids.assert_called_once_with([
			'shared', 'archived', 'shared', 'fresh'
		])
		worker.change_json_history_service.exists_by_resource_id.assert_not_called()
		self.assertEqual([
			call(trigger_event, model_config, first),
			call(trigger_event, model_config, later_duplicate),
			call(trigger_event, model_config, fresh)
		], worker.post_json.call_args_list)
		worker.update_result.assert_called_once_with(already_archived, True)
		self.assertTrue(already_archived.isPosted)

	def test_failed_post_shadows_later_duplicate_after_history_archive(self):
		worker = self.build_json_worker()
		first = SimpleNamespace(changeJsonId=1, resourceId='shared', isPosted=False)
		second = SimpleNamespace(changeJsonId=2, resourceId='shared', isPosted=False)
		worker.change_json_service.find_json_by_ids.return_value = [first, second]
		worker.change_json_history_service.find_existing_resource_ids.return_value = []
		worker.post_json.side_effect = RuntimeError('post failed')
		trigger_event = SimpleNamespace()
		model_config = SimpleNamespace()

		worker.process_single_change_data_json(trigger_event, model_config, [1, 2])

		worker.post_json.assert_called_once_with(trigger_event, model_config, first)
		self.assertEqual([call(first), call(second, True)], worker.update_result.call_args_list)
		self.assertTrue(first.isPosted)
		self.assertTrue(second.isPosted)
		self.assertIn('RuntimeError: post failed', first.result)

	def test_object_ids_reads_trigger_model_and_config_once(self):
		worker = self.build_json_worker()
		worker.trigger_model_service = Mock()
		worker.model_config_service = Mock()
		worker.post_grouped_json = Mock()
		trigger_model = SimpleNamespace(modelName='orders', tenantId='tenant-1')
		model_config = SimpleNamespace()
		worker.trigger_model_service.find_trigger_by_id.return_value = trigger_model
		worker.model_config_service.find_by_name.return_value = model_config
		worker.change_json_service.find_grouped_ids_by_object_id.side_effect = [
			[{'change_json_id': 1}], [{'change_json_id': 2}]
		]
		trigger_event = SimpleNamespace()

		worker.process_object_ids(trigger_event, 9, ['object-1', 'object-2'])

		worker.trigger_model_service.find_trigger_by_id.assert_called_once_with(9)
		worker.model_config_service.find_by_name.assert_called_once_with('orders', 'tenant-1')
		self.assertEqual([
			call(trigger_event, model_config, 'object-1', [1]),
			call(trigger_event, model_config, 'object-2', [2])
		], worker.post_grouped_json.call_args_list)


class DatasourceNegativeCacheTest(TestCase):
	def setUp(self):
		storage_helper._datasource_negative_cache.clear()

	@patch('watchmen_collector_kernel.service.storage_helper.get_collector_data_source_service')
	def test_negative_datasource_cache_avoids_repeated_reads_and_isolates_param_names(self, get_service):
		service = Mock()
		other_datasource = SimpleNamespace(dataSourceId='other')
		service.find_datasource_by_tenant_id.side_effect = [None, other_datasource]
		get_service.return_value = service
		principal_service = Mock()

		self.assertIsNone(storage_helper.ask_datasource_by_param_name('tenant-1', principal_service, 'collector'))
		self.assertIsNone(storage_helper.ask_datasource_by_param_name('tenant-1', principal_service, 'collector'))
		self.assertEqual(1, service.find_datasource_by_tenant_id.call_count)
		self.assertIs(
			other_datasource,
			storage_helper.ask_datasource_by_param_name('tenant-1', principal_service, 'other')
		)
		self.assertEqual(2, service.find_datasource_by_tenant_id.call_count)

	@patch('watchmen_collector_kernel.service.storage_helper.monotonic')
	@patch('watchmen_collector_kernel.service.storage_helper.get_collector_data_source_service')
	def test_negative_datasource_cache_expires(self, get_service, monotonic):
		service = Mock()
		service.find_datasource_by_tenant_id.return_value = None
		get_service.return_value = service
		principal_service = Mock()
		monotonic.return_value = 100

		storage_helper.ask_datasource_by_param_name('tenant-1', principal_service, 'collector')
		storage_helper.ask_datasource_by_param_name('tenant-1', principal_service, 'collector')
		self.assertEqual(1, service.find_datasource_by_tenant_id.call_count)
		monotonic.return_value = 100 + storage_helper.DATASOURCE_NEGATIVE_CACHE_TTL_SECONDS + 1
		storage_helper.ask_datasource_by_param_name('tenant-1', principal_service, 'collector')
		self.assertEqual(2, service.find_datasource_by_tenant_id.call_count)
