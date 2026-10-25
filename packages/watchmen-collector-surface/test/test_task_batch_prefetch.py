from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, Mock, patch

from watchmen_collector_kernel.model import Status
from watchmen_collector_surface.task.task_listener import TaskListener


class TaskBatchPrefetchTest(TestCase):
	def build_task(self, task_id, change_json_ids):
		return SimpleNamespace(
			taskId=task_id,
			changeJsonIds=change_json_ids,
			status=Status.EXECUTING.value,
			isFinished=False,
			result=None
		)

	def build_json(self, change_json_id, resource_id):
		return SimpleNamespace(
			changeJsonId=change_json_id,
			resourceId=resource_id,
			content={},
			isPosted=False,
			status=None,
			result=None
		)

	def build_listener(self, tasks):
		listener = TaskListener.__new__(TaskListener)
		listener.data_size_threshold = 1000
		listener.change_json_service = Mock()
		listener.change_json_history_service = Mock()
		listener.change_json_history_service.find_existing_resource_ids.return_value = []
		listener.find_tasks_and_locked = Mock(side_effect=[tasks, []])
		listener.restore_task = Mock()
		listener.process_sub_tasks = AsyncMock()
		listener.archive_task_jsons = Mock()
		listener.archive_finished_tasks = Mock()
		listener.handle_unfinished_change_json = Mock()
		listener.truncated_string = Mock(return_value='failed')
		return listener

	def process_tasks(self, listener):
		with patch('watchmen_collector_surface.task.task_listener.ask_listener_time_budget_seconds',
		           return_value=60):
			listener.process_tasks()

	def test_claim_prefetches_json_and_history_once_and_preserves_task_order(self):
		tasks = [self.build_task(1, [2, 1]), self.build_task(2, [3])]
		jsons = [self.build_json(1, 'resource-1'), self.build_json(2, 'resource-2'),
		         self.build_json(3, 'resource-3')]
		listener = self.build_listener(tasks)
		listener.change_json_service.find_json_by_ids.return_value = [jsons[0], jsons[2], jsons[1]]

		self.process_tasks(listener)

		listener.change_json_service.find_json_by_ids.assert_called_once_with([2, 1, 3])
		listener.change_json_history_service.find_existing_resource_ids.assert_called_once_with(
			['resource-1', 'resource-3', 'resource-2'])
		self.assertEqual([2, 1, 3], [
			call.args[1].changeJsonId for call in listener.process_sub_tasks.call_args_list
		])
		self.assertEqual(3, listener.archive_task_jsons.call_count)
		listener.archive_finished_tasks.assert_called_once_with(tasks)

	def test_successful_task_shadows_same_resource_in_next_task(self):
		tasks = [self.build_task(1, [1]), self.build_task(2, [2])]
		jsons = [self.build_json(1, 'resource-1'), self.build_json(2, 'resource-1')]
		listener = self.build_listener(tasks)
		listener.change_json_service.find_json_by_ids.return_value = jsons

		self.process_tasks(listener)

		self.assertEqual(1, listener.process_sub_tasks.call_count)
		self.assertEqual(([jsons[0]], [], []), listener.archive_task_jsons.call_args_list[0].args)
		self.assertEqual(([], [jsons[1]], []), listener.archive_task_jsons.call_args_list[1].args)
		self.assertTrue(jsons[1].isPosted)
		self.assertEqual(Status.SUCCESS.value, tasks[1].status)

	def test_failed_task_shadows_same_resource_in_next_task(self):
		tasks = [self.build_task(1, [1]), self.build_task(2, [2])]
		jsons = [self.build_json(1, 'resource-1'), self.build_json(2, 'resource-1')]
		listener = self.build_listener(tasks)
		listener.change_json_service.find_json_by_ids.return_value = jsons
		listener.process_sub_tasks.side_effect = RuntimeError('execution failed')

		with self.assertLogs('apscheduler', level='ERROR'):
			self.process_tasks(listener)

		self.assertEqual(1, listener.process_sub_tasks.call_count)
		self.assertEqual(([], [], [jsons[0]]), listener.archive_task_jsons.call_args_list[0].args)
		self.assertEqual(([], [jsons[1]], []), listener.archive_task_jsons.call_args_list[1].args)
		self.assertEqual(Status.FAIL.value, tasks[0].status)
		self.assertEqual(Status.SUCCESS.value, tasks[1].status)

	def test_prefetch_failure_falls_back_to_existing_per_task_reads(self):
		tasks = [self.build_task(1, [1]), self.build_task(2, [2])]
		jsons = [self.build_json(1, 'resource-1'), self.build_json(2, 'resource-2')]
		listener = self.build_listener(tasks)
		listener.change_json_service.find_json_by_ids.side_effect = [
			RuntimeError('prefetch failed'), [jsons[0]], [jsons[1]]
		]

		with self.assertLogs('apscheduler', level='ERROR'):
			self.process_tasks(listener)

		self.assertEqual([[1, 2], [1], [2]], [
			call.args[0] for call in listener.change_json_service.find_json_by_ids.call_args_list
		])
		self.assertEqual(2, listener.change_json_history_service.find_existing_resource_ids.call_count)
		self.assertEqual([1, 2], [
			call.args[1].changeJsonId for call in listener.process_sub_tasks.call_args_list
		])

	def test_oversized_task_uses_per_task_path(self):
		change_json_ids = list(range(1, 502))
		task = self.build_task(1, change_json_ids)
		listener = self.build_listener([task])
		listener.change_json_service.find_json_by_ids.return_value = []
		listener.prefetch_change_data_jsons = Mock(side_effect=AssertionError('must not prefetch'))

		self.process_tasks(listener)

		listener.prefetch_change_data_jsons.assert_not_called()
		listener.change_json_service.find_json_by_ids.assert_called_once_with(change_json_ids)
		listener.change_json_history_service.find_existing_resource_ids.assert_called_once_with([])

	def test_prefetch_windows_are_bounded_to_500_unique_ids(self):
		tasks = [self.build_task(1, list(range(1, 301))), self.build_task(2, list(range(301, 601)))]
		first_jsons = [self.build_json(json_id, f'resource-{json_id}') for json_id in range(1, 301)]
		second_jsons = [self.build_json(json_id, f'resource-{json_id}') for json_id in range(301, 601)]
		listener = self.build_listener(tasks)
		listener.change_json_service.find_json_by_ids.side_effect = [first_jsons, second_jsons]

		self.process_tasks(listener)

		self.assertEqual([300, 300], [
			len(call.args[0]) for call in listener.change_json_service.find_json_by_ids.call_args_list
		])
		self.assertEqual(2, listener.change_json_history_service.find_existing_resource_ids.call_count)
		self.assertEqual(600, listener.process_sub_tasks.call_count)
