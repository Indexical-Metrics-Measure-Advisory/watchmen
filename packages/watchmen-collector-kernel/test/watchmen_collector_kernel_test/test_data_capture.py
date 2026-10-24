from datetime import datetime
from unittest import TestCase
from unittest.mock import Mock, call, patch

from watchmen_collector_kernel.model import CollectorTableConfig, ConditionExpression, ConditionJoint
from watchmen_collector_kernel.service.data_capture import DataCaptureService
from watchmen_storage import EntityCriteriaOperator


class DataCaptureBatchTest(TestCase):
	def setUp(self):
		self.service = DataCaptureService.__new__(DataCaptureService)
		self.service.build_jsons = Mock()

	def create_child_config(self, child_key) -> CollectorTableConfig:
		return CollectorTableConfig(
			name='child', tableName='child_table', label='children', isList=True,
			joinKeys=[{'childKey': child_key}])

	def assert_row_by_row_fallback(self, child_config, parents):
		with patch.object(self.service, 'get_child_data') as get_child_data, \
				patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor') as ask_source_extractor:
			self.service.mount_child_batch(child_config, parents)
			self.assertEqual(
				[call(child_config, parent) for parent in parents], get_child_data.call_args_list)
			ask_source_extractor.assert_not_called()

	def test_non_equals_expression_falls_back(self):
		child_config = self.create_child_config(ConditionExpression(
			columnName='parentId', operator=EntityCriteriaOperator.GREATER_THAN, columnValue='{id}'))
		parents = [{'id': 1}, {'id': 2}]

		self.assert_row_by_row_fallback(child_config, parents)

	def test_null_template_value_falls_back_for_whole_batch(self):
		child_config = self.create_child_config(ConditionExpression(
			columnName='parentId', operator=EntityCriteriaOperator.EQUALS, columnValue='{id}'))
		parents = [{'id': 1}, {'id': None}]

		self.assert_row_by_row_fallback(child_config, parents)

	def test_condition_joint_falls_back(self):
		child_config = self.create_child_config(ConditionJoint(children=[ConditionExpression(
			columnName='parentId', operator=EntityCriteriaOperator.EQUALS, columnValue='{id}')]))
		parents = [{'id': 1}, {'id': 2}]

		self.assert_row_by_row_fallback(child_config, parents)

	def test_date_values_use_normalized_keys_for_query_and_mount(self):
		child_config = self.create_child_config(ConditionExpression(
			columnName='eventDate', operator=EntityCriteriaOperator.EQUALS, columnValue='{eventDate}'))
		parents = [{'eventDate': '2024-01-02'}]
		child_row = {'eventDate': datetime(2024, 1, 2), 'value': 'matched'}
		extractor = Mock()
		extractor.find_records_by_criteria.return_value = [child_row]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			self.service.mount_child_batch(child_config, parents)

		criteria = extractor.find_records_by_criteria.call_args.args[0]
		self.assertEqual(EntityCriteriaOperator.IN, criteria[0].operator)
		self.assertEqual([datetime(2024, 1, 2)], criteria[0].right)
		self.assertEqual([child_row], parents[0]['children'])

	def test_plain_equals_uses_one_batch_and_mounts_all_parents(self):
		child_config = self.create_child_config(ConditionExpression(
			columnName='parentId', operator=EntityCriteriaOperator.EQUALS, columnValue='{id}'))
		parents = [{'id': 'p1'}, {'id': 'p2'}, {'id': 'p1'}]
		first_child = {'parentId': 'p1', 'value': 'first'}
		second_child = {'parentId': 'p2', 'value': 'second'}
		extractor = Mock()
		extractor.find_records_by_criteria.return_value = [first_child, second_child]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			self.service.mount_child_batch(child_config, parents)

		extractor.find_records_by_criteria.assert_called_once()
		criteria = extractor.find_records_by_criteria.call_args.args[0]
		self.assertEqual(EntityCriteriaOperator.IN, criteria[0].operator)
		self.assertEqual(['p1', 'p2'], criteria[0].right)
		self.assertEqual([first_child], parents[0]['children'])
		self.assertEqual([second_child], parents[1]['children'])
		self.assertEqual([first_child], parents[2]['children'])
