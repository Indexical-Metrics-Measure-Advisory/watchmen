from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from watchmen_collector_kernel.model import Status
from watchmen_collector_kernel.storage import ChangeDataJsonService
from watchmen_collector_surface.cdc.post_json import ModelExecutor, PostJsonService, SequencedModelExecutor


class PostJsonDbAccessTest(TestCase):
	def test_update_task_ids_chunks_case_updates(self):
		service = ChangeDataJsonService.__new__(ChangeDataJsonService)
		service.storage = Mock(spec=['update_by_ids_with_case'])
		service.storage.update_by_ids_with_case.return_value = 1
		mapping = {json_id: json_id + 10000 for json_id in range(1201)}
		common_update = {'is_posted': True, 'status': Status.WAITING.value}

		updated_count = service.update_task_ids(mapping, common_update)

		self.assertEqual(3, updated_count)
		calls = service.storage.update_by_ids_with_case.call_args_list
		self.assertEqual([500, 500, 201], [len(call.args[1]) for call in calls])
		self.assertEqual(mapping, {
			json_id: task_id
			for call in calls
			for json_id, task_id in call.args[1].items()
		})
		for call in calls:
			self.assertEqual('change_data_json', call.args[0].name)
			self.assertEqual('task_id', call.args[2])
			self.assertIs(common_update, call.args[3])

	def test_update_task_ids_falls_back_to_targeted_updates(self):
		service = ChangeDataJsonService.__new__(ChangeDataJsonService)
		service.storage = Mock(spec=['update'])
		service.storage.update.return_value = 1
		common_update = {'is_posted': True, 'status': Status.WAITING.value}

		updated_count = service.update_task_ids({11: 101, 12: 102}, common_update)

		self.assertEqual(2, updated_count)
		self.assertEqual(2, service.storage.update.call_count)
		updates = [call.args[0] for call in service.storage.update.call_args_list]
		self.assertEqual([11, 12], [update.criteria[0].right[0] for update in updates])
		self.assertEqual([101, 102], [update.update['task_id'] for update in updates])
		for update in updates:
			self.assertEqual(True, update.update['is_posted'])
			self.assertEqual(Status.WAITING.value, update.update['status'])

	def test_post_jsons_updates_task_ids_before_commit(self):
		service = ModelExecutor.__new__(ModelExecutor)
		service.scheduled_task_service = Mock()
		service.change_json_service = Mock()
		tasks = [SimpleNamespace(taskId=101), SimpleNamespace(taskId=102)]
		change_jsons = [
			SimpleNamespace(changeJsonId=11, isPosted=False, status=0, taskId=None),
			SimpleNamespace(changeJsonId=12, isPosted=False, status=0, taskId=None)
		]
		events = []
		service.change_json_service.update_task_ids.side_effect = lambda *args: events.append('update')
		service.scheduled_task_service.commit_transaction.side_effect = lambda: events.append('commit')

		service.post_jsons(tasks, change_jsons)

		service.scheduled_task_service.add_all.assert_called_once_with(tasks)
		service.change_json_service.update_task_ids.assert_called_once_with(
			{11: 101, 12: 102}, {'is_posted': True, 'status': Status.WAITING.value})
		service.change_json_service.update_by_ids.assert_not_called()
		self.assertEqual([101, 102], [change_json.taskId for change_json in change_jsons])
		self.assertEqual(['update', 'commit'], events)

	def test_sequenced_objects_are_grouped_and_posted_in_bulk(self):
		service = SequencedModelExecutor.__new__(SequencedModelExecutor)
		service.scheduled_task_service = Mock()
		service.change_json_service = Mock()
		service.change_json_service.find_grouped_ids_by_object_ids.return_value = [
			{'object_id': 'object-1', 'change_json_id': 11},
			{'object_id': 'object-1', 'change_json_id': 12},
			{'object_id': 'object-2', 'change_json_id': 21},
			{'object_id': 'object-2', 'change_json_id': 22}
		]
		service.get_grouped_json_scheduled_task = Mock(side_effect=[
			SimpleNamespace(taskId=101, objectId='object-1', changeJsonIds=[11, 12]),
			SimpleNamespace(taskId=102, objectId='object-2', changeJsonIds=[21, 22])
		])
		trigger_event = SimpleNamespace()
		trigger_model = SimpleNamespace(modelName='orders', modelTriggerId=7)
		model_config = SimpleNamespace()
		object_ids = ['object-1', 'empty-object', 'object-2']

		service.process_object_ids(trigger_event, trigger_model, model_config, object_ids)

		service.change_json_service.find_grouped_ids_by_object_ids.assert_called_once_with(
			'orders', object_ids, 7)
		tasks = service.scheduled_task_service.add_all.call_args.args[0]
		self.assertEqual([[11, 12], [21, 22]], [task.changeJsonIds for task in tasks])
		service.change_json_service.update_task_ids.assert_called_once_with(
			{11: 101, 12: 101, 21: 102, 22: 102},
			{'is_posted': True, 'status': Status.WAITING.value})
		service.scheduled_task_service.create.assert_not_called()
		service.scheduled_task_service.commit_transaction.assert_called_once_with()

	def test_sequenced_bulk_failure_closes_before_per_object_fallback(self):
		service = SequencedModelExecutor.__new__(SequencedModelExecutor)
		service.scheduled_task_service = Mock()
		service.change_json_service = Mock()
		service.change_json_service.find_grouped_ids_by_object_ids.return_value = [
			{'object_id': 'object-1', 'change_json_id': 11},
			{'object_id': 'object-2', 'change_json_id': 21}
		]
		service.get_grouped_json_scheduled_task = Mock(side_effect=[
			SimpleNamespace(taskId=101, objectId='object-1', changeJsonIds=[11]),
			SimpleNamespace(taskId=102, objectId='object-2', changeJsonIds=[21])
		])
		service.scheduled_task_service.add_all.side_effect = RuntimeError('bulk failed')
		service.post_grouped_json_v2 = Mock()
		events = []
		service.scheduled_task_service.close_transaction.side_effect = lambda: events.append('close')
		service.post_grouped_json_v2.side_effect = lambda *args: events.append(args[1])
		trigger_model = SimpleNamespace(modelName='orders', modelTriggerId=7)

		service.process_object_ids(SimpleNamespace(), trigger_model, SimpleNamespace(), ['object-1', 'object-2'])

		self.assertEqual(['close', 'object-1', 'object-2'], events)
		service.scheduled_task_service.rollback_transaction.assert_called_once_with()

	def test_module_priority_reuses_list_and_memoizes_within_event_pass(self):
		service = PostJsonService.__new__(PostJsonService)
		service.trigger_module_service = Mock()
		modules = [
			SimpleNamespace(moduleTriggerId=1, eventTriggerId=9, priority=0, moduleName='base'),
			SimpleNamespace(moduleTriggerId=2, eventTriggerId=9, priority=1, moduleName='next'),
			SimpleNamespace(moduleTriggerId=3, eventTriggerId=9, priority=2, moduleName='last')
		]
		service.trigger_module_service.find_by_event_trigger_id.return_value = modules
		service.is_trigger_module_finished = Mock(return_value=True)
		service.process_models = Mock()
		event = SimpleNamespace(eventTriggerId=9)

		service.process_modules(event)
		service.process_modules(event)

		self.assertEqual(2, service.trigger_module_service.find_by_event_trigger_id.call_count)
		self.assertEqual(2, service.is_trigger_module_finished.call_count)
		service.is_trigger_module_finished.assert_called_with(modules[0])
		self.assertEqual(6, service.process_models.call_count)

	@patch('watchmen_collector_surface.cdc.post_json.get_model_executor')
	def test_model_priority_reuses_list_and_memoizes_within_module_pass(self, get_executor):
		service = PostJsonService.__new__(PostJsonService)
		service.trigger_model_service = Mock()
		service.model_config_service = Mock()
		service.model_config_service.find_by_name.return_value = SimpleNamespace()
		service.competitive_lock_service = Mock()
		service.change_record_service = Mock()
		service.change_json_service = Mock()
		service.change_json_history_service = Mock()
		service.scheduled_task_service = Mock()
		models = [
			SimpleNamespace(modelTriggerId=1, moduleTriggerId=8, priority=0, modelName='base', tenantId='tenant'),
			SimpleNamespace(modelTriggerId=2, moduleTriggerId=8, priority=1, modelName='next', tenantId='tenant'),
			SimpleNamespace(modelTriggerId=3, moduleTriggerId=8, priority=2, modelName='last', tenantId='tenant')
		]
		service.trigger_model_service.find_by_module_trigger_id.return_value = models
		service.is_trigger_model_post_json_finished = Mock(return_value=True)
		get_executor.return_value = Mock()
		trigger_module = SimpleNamespace(moduleTriggerId=8)

		service.process_models(SimpleNamespace(), trigger_module)
		service.process_models(SimpleNamespace(), trigger_module)

		self.assertEqual(2, service.trigger_model_service.find_by_module_trigger_id.call_count)
		self.assertEqual(2, service.is_trigger_model_post_json_finished.call_count)
		service.is_trigger_model_post_json_finished.assert_called_with(models[0])
		self.assertEqual(6, get_executor.return_value.process_model.call_count)

	def test_completion_checks_use_exists_with_connect_and_close(self):
		service = ChangeDataJsonService.__new__(ChangeDataJsonService)
		service.storage = Mock()
		service.storage.exists.return_value = False

		self.assertTrue(service.is_event_finished(1))
		self.assertTrue(service.is_model_finished(2))
		self.assertTrue(service.is_module_finished(3))
		self.assertTrue(service.is_table_finished(4))

		self.assertEqual(4, service.storage.connect.call_count)
		self.assertEqual(4, service.storage.close.call_count)
		self.assertEqual(4, service.storage.exists.call_count)
		criteria = [call.args[0].criteria[0] for call in service.storage.exists.call_args_list]
		self.assertEqual(
			['event_trigger_id', 'model_trigger_id', 'module_trigger_id', 'table_trigger_id'],
			[criterion.left.columnName for criterion in criteria])
		self.assertEqual([1, 2, 3, 4], [criterion.right for criterion in criteria])

	def test_find_json_by_ids_connects_once_outside_chunks(self):
		service = ChangeDataJsonService.__new__(ChangeDataJsonService)
		service.storage = Mock()
		service.storage.find.return_value = []

		service.find_json_by_ids(list(range(1200)))

		service.storage.connect.assert_called_once_with()
		service.storage.close.assert_called_once_with()
		self.assertEqual(3, service.storage.find.call_count)
