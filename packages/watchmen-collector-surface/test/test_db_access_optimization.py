from datetime import datetime
from unittest import TestCase
from unittest.mock import Mock

from watchmen_collector_kernel.storage import ChangeDataRecordService, ScheduledTaskService, TriggerEventService
from watchmen_storage import EntityCriteriaOperator, EntityLimitedFinder, EntitySortMethod


class DbAccessOptimizationTest(TestCase):
	def build_service(self, service_class):
		service = service_class.__new__(service_class)
		service.storage = Mock()
		service.begin_transaction = Mock()
		service.close_transaction = Mock()
		return service

	def assert_criteria(self, finder, expected):
		actual = [
			(expression.left.columnName, expression.operator, expression.right)
			for expression in finder.criteria
		]
		self.assertEqual(expected, actual)

	def test_record_completion_checks_use_exists_with_unchanged_criteria(self):
		checks = [
			('is_event_finished', 'event_trigger_id'),
			('is_model_finished', 'model_trigger_id'),
			('is_module_finished', 'module_trigger_id'),
			('is_table_finished', 'table_trigger_id')
		]
		for method_name, column_name in checks:
			with self.subTest(method=method_name):
				service = self.build_service(ChangeDataRecordService)
				service.storage.exists.return_value = False

				self.assertTrue(getattr(service, method_name)(17))

				service.storage.connect.assert_called_once_with()
				service.storage.close.assert_called_once_with()
				service.storage.find_limited.assert_not_called()
				service.begin_transaction.assert_not_called()
				finder = service.storage.exists.call_args.args[0]
				self.assert_criteria(finder, [(column_name, EntityCriteriaOperator.EQUALS, 17)])

	def test_task_completion_checks_use_exists_with_unchanged_criteria(self):
		checks = [
			('is_event_finished', (17,), [('event_trigger_id', 17)]),
			('is_model_finished', ('model-1', 17), [('model_name', 'model-1'), ('event_trigger_id', 17)])
		]
		for method_name, args, criteria in checks:
			with self.subTest(method=method_name):
				service = self.build_service(ScheduledTaskService)
				service.storage.exists.return_value = True

				self.assertFalse(getattr(service, method_name)(*args))

				service.storage.connect.assert_called_once_with()
				service.storage.close.assert_called_once_with()
				service.storage.find_limited.assert_not_called()
				service.begin_transaction.assert_not_called()
				finder = service.storage.exists.call_args.args[0]
				self.assert_criteria(
					finder,
					[(column_name, EntityCriteriaOperator.EQUALS, value) for column_name, value in criteria]
				)

	def test_dependent_task_check_negates_exists_with_unchanged_criteria(self):
		service = self.build_service(ScheduledTaskService)
		service.storage.exists.side_effect = [True, False]

		self.assertFalse(service.is_dependent_task_finished('model-1', 'object-1', 'tenant-1'))
		self.assertTrue(service.is_dependent_task_finished('model-1', 'object-1', 'tenant-1'))

		self.assertEqual(2, service.begin_transaction.call_count)
		self.assertEqual(2, service.close_transaction.call_count)
		service.storage.count.assert_not_called()
		for call in service.storage.exists.call_args_list:
			self.assert_criteria(call.args[0], [
				('model_name', EntityCriteriaOperator.EQUALS, 'model-1'),
				('object_id', EntityCriteriaOperator.EQUALS, 'object-1'),
				('is_finished', EntityCriteriaOperator.EQUALS, False),
				('tenant_id', EntityCriteriaOperator.EQUALS, 'tenant-1')
			])

	def test_tenant_event_reads_are_limited_to_one(self):
		event = Mock()
		checks = [
			('find_initial_event_by_tenant_id', 0, [('event_trigger_id', EntitySortMethod.ASC)]),
			('find_executing_event_by_tenant_id', 1, None)
		]
		for method_name, status, sort in checks:
			with self.subTest(method=method_name):
				service = self.build_service(TriggerEventService)
				service.storage.find_limited.return_value = [event]

				self.assertIs(event, getattr(service, method_name)('tenant-1'))

				service.storage.find.assert_not_called()
				finder = service.storage.find_limited.call_args.args[0]
				self.assertIsInstance(finder, EntityLimitedFinder)
				self.assertEqual(1, finder.limit)
				self.assert_criteria(finder, [
					('status', EntityCriteriaOperator.EQUALS, status),
					('tenant_id', EntityCriteriaOperator.EQUALS, 'tenant-1')
				])
				actual_sort = None if finder.sort is None else [(column.name, column.method) for column in finder.sort]
				self.assertEqual(sort, actual_sort)

	def test_timeout_task_scan_projects_only_task_id(self):
		service = self.build_service(ScheduledTaskService)
		query_time = datetime(2026, 1, 2, 3, 4, 5)
		service.storage.find_limited.return_value = []

		self.assertEqual([], service.find_timeout_task(query_time))

		service.storage.connect.assert_called_once_with()
		service.storage.close.assert_called_once_with()
		finder = service.storage.find_limited.call_args.args[0]
		self.assertEqual(['task_id'], finder.columns)
		self.assertEqual(500, finder.limit)
		self.assert_criteria(finder, [
			('last_modified_at', EntityCriteriaOperator.LESS_THAN, query_time),
			('status', EntityCriteriaOperator.EQUALS, 1)
		])
		self.assertEqual([('task_id', EntitySortMethod.ASC)], [
			(column.name, column.method) for column in finder.sort
		])
