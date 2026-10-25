from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, call, patch

from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_collector_kernel.service.data_capture import DataCaptureService
from watchmen_collector_kernel.service.extract_source import SourceS3Extractor
from watchmen_collector_surface.cdc.record_to_json import RecordToJsonService


class RootBatchTest(TestCase):
	def create_config(self, **overrides) -> CollectorTableConfig:
		values = {
			'configId': 'config-1', 'name': 'orders', 'tableName': 'orders',
			'primaryKey': ['id'], 'tenantId': 'tenant-1'
		}
		values.update(overrides)
		return CollectorTableConfig(**values)

	def create_record(self, record_id: int, data_id, config: CollectorTableConfig) -> SimpleNamespace:
		return SimpleNamespace(
			changeRecordId=record_id, tenantId=config.tenantId, tableName=config.tableName,
			dataId=data_id, rootTableName=None, rootDataId=None, result={})

	def create_service(self, config: CollectorTableConfig) -> RecordToJsonService:
		service = RecordToJsonService.__new__(RecordToJsonService)
		service.table_config_service = Mock()
		service.table_config_service.find_by_name.return_value = config
		service.data_capture_service = DataCaptureService.__new__(DataCaptureService)
		service.performance_result = Mock()
		service.update_result = Mock()
		return service

	def test_direct_roots_batch_repeated_ids_and_keep_root_data_independent(self):
		config = self.create_config()
		service = self.create_service(config)
		service.find_root = Mock()
		records = [
			self.create_record(1, {'id': 1}, config),
			self.create_record(2, {'id': 2}, config),
			self.create_record(3, {'id': 1}, config)
		]
		extractor = Mock()
		extractor.find_records_by_criteria.return_value = [
			{'id': 1, 'payload': {'items': ['first']}},
			{'id': 2, 'payload': {'items': ['second']}}
		]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			roots = service.resolve_roots(records)

		extractor.find_records_by_criteria.assert_called_once()
		criteria = extractor.find_records_by_criteria.call_args.args[0]
		self.assertEqual([1, 2], criteria[0].right)
		service.find_root.assert_not_called()
		self.assertEqual(['orders'] * 3, [record.rootTableName for record, _, _ in roots])
		self.assertEqual([{'id': 1}, {'id': 2}, {'id': 1}], [record.rootDataId for record, _, _ in roots])
		self.assertEqual({'items': ['first']}, roots[0][2]['payload'])
		self.assertIsNot(roots[0][2], roots[2][2])
		self.assertIsNot(roots[0][2]['payload'], roots[2][2]['payload'])
		roots[0][2]['payload']['items'].append('changed')
		self.assertEqual({'items': ['first']}, roots[2][2]['payload'])

	def test_direct_roots_are_fetched_in_chunks_of_500(self):
		config = self.create_config()
		service = self.create_service(config)
		service.find_root = Mock()
		records = [self.create_record(index, {'id': index}, config) for index in range(1001)]
		extractor = Mock()
		extractor.find_records_by_criteria.side_effect = lambda criteria: [
			{'ID': value} for value in criteria[0].right]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			roots = service.resolve_roots(records)

		self.assertEqual(1001, len(roots))
		self.assertEqual([500, 500, 1], [
			len(criteria.args[0][0].right)
			for criteria in extractor.find_records_by_criteria.call_args_list
		])
		service.find_root.assert_not_called()

	def test_topic_root_batch_preserves_column_name_case(self):
		config = self.create_config(configId='f-topic-1', primaryKey=['ID'])
		service = self.create_service(config)
		record = self.create_record(1, {'ID': 1}, config)
		extractor = Mock()
		extractor.find_records_by_criteria.return_value = [{'ID': 1, 'productCode': 'A'}]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			roots = service.resolve_roots([record])

		self.assertEqual({'ID': 1, 'productCode': 'A'}, roots[0][2])
		self.assertNotIn('productcode', roots[0][2])

	def test_missing_and_multiple_matches_retry_failed_root_resolution(self):
		config = self.create_config()
		service = self.create_service(config)
		service.find_root = Mock(side_effect=RuntimeError('invalid root'))
		records = [
			self.create_record(1, {'id': 1}, config),
			self.create_record(2, {'id': 2}, config),
			self.create_record(3, {'id': 3}, config),
			self.create_record(4, {'id': 3}, config)
		]
		extractor = Mock()
		extractor.find_records_by_criteria.return_value = [
			{'ID': 1}, {'ID': 2}, {'ID': 2}]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor), \
				self.assertLogs('apscheduler', level='ERROR'):
			roots = service.resolve_roots(records)

		self.assertEqual([1], [record.changeRecordId for record, _, _ in roots])
		self.assertEqual(
			[call(config, records[1]), call(config, records[2]), call(config, records[3])],
			service.find_root.call_args_list)
		self.assertEqual(3, service.update_result.call_count)

	def test_ancestors_and_composite_keys_use_memoized_find_root(self):
		for overrides in ({'parentName': 'parent'}, {'primaryKey': ['tenant', 'id']}):
			with self.subTest(overrides=overrides):
				config = self.create_config(**overrides)
				service = self.create_service(config)
				root_data = {'id': 1, 'nested': {'value': []}}
				service.find_root = Mock(side_effect=lambda config_, record: (config_, root_data, record))
				records = [
					self.create_record(1, {'id': 1}, config),
					self.create_record(2, {'id': 1}, config)
				]

				roots = service.resolve_roots(records)

				service.find_root.assert_called_once_with(config, records[0])
				self.assertEqual(2, len(roots))
				self.assertIsNot(roots[0][2], roots[1][2])
				self.assertIsNot(roots[0][2]['nested'], roots[1][2]['nested'])

	def test_s3_uses_memoized_find_root(self):
		config = self.create_config()
		service = self.create_service(config)
		service.find_root = Mock(side_effect=lambda config_, record: (
			config_, {'id': record.dataId['id']}, record))
		records = [
			self.create_record(1, {'id': 1}, config),
			self.create_record(2, {'id': 1}, config)
		]
		extractor = SourceS3Extractor.__new__(SourceS3Extractor)

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			roots = service.resolve_roots(records)

		self.assertEqual(2, len(roots))
		service.find_root.assert_called_once_with(config, records[0])

	def test_resolution_cache_does_not_cross_claims(self):
		config = self.create_config()
		service = self.create_service(config)
		extractor = Mock()
		extractor.find_records_by_criteria.side_effect = lambda criteria: [
			{'ID': value} for value in criteria[0].right]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor):
			service.resolve_roots([self.create_record(1, {'id': 1}, config)])
			service.resolve_roots([self.create_record(2, {'id': 1}, config)])

		self.assertEqual(2, extractor.find_records_by_criteria.call_count)

	def test_missing_config_fails_only_its_own_record(self):
		config = self.create_config()
		service = self.create_service(config)
		service.table_config_service.find_by_name.side_effect = [None, config]
		missing = self.create_record(1, {'id': 1}, config)
		missing.tableName = 'missing'
		valid = self.create_record(2, {'id': 2}, config)
		extractor = Mock()
		extractor.find_records_by_criteria.return_value = [{'ID': 2}]

		with patch('watchmen_collector_kernel.service.data_capture.ask_source_extractor', return_value=extractor), \
				self.assertLogs('apscheduler', level='ERROR'):
			roots = service.resolve_roots([missing, valid])

		self.assertEqual(1, len(roots))
		self.assertEqual(valid, roots[0][0])
		service.update_result.assert_called_once()
		self.assertEqual(missing, service.update_result.call_args.args[0])
