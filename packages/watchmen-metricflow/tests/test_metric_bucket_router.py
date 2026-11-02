import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import TENANT_ID, build_client, console_principal
from watchmen_indicator_kernel.meta import BucketService
from watchmen_model.common import DataPage
from watchmen_model.indicator import Bucket, BucketType, RangeBucketValueIncluding
from watchmen_metricflow.router import metric_bucket_router


def make_bucket(**overrides):
	data = {
		'bucketId': 'bucket-1',
		'name': 'Revenue bands',
		'type': 'value',
		'include': 'include-min',
		'tenantId': TENANT_ID,
		'version': 1,
		'segments': [
			{'name': 'low', 'value': {'max': '100'}},
			{'name': 'high', 'value': {'min': '100'}},
		],
	}
	data.update(overrides)
	return Bucket(**data)


class TestMetricBucketRouter(unittest.TestCase):
	def setUp(self):
		self.service = mock.MagicMock(spec=BucketService)
		self.service.is_storable_id_faked.return_value = True
		self.service_patch = mock.patch.object(
			metric_bucket_router, 'get_bucket_service', return_value=self.service)
		self.service_patch.start()
		self.client = build_client(metric_bucket_router.router, principal=console_principal())

	def tearDown(self):
		self.service_patch.stop()

	def test_create_defaults_to_value_and_include_min(self):
		self.service.redress_storable_id.side_effect = lambda bucket: bucket
		self.service.create.side_effect = lambda bucket: bucket
		response = self.client.post('/metricflow/buckets', json={
			'name': 'Revenue bands',
			'segments': [{'name': 'all', 'value': {'min': '0'}}],
		})
		self.assertEqual(200, response.status_code, response.text)
		body = response.json()
		self.assertEqual(BucketType.VALUE.value, body['type'])
		self.assertEqual(RangeBucketValueIncluding.INCLUDE_MIN.value, body['include'])
		self.assertEqual(TENANT_ID, body['tenantId'])
		self.service.create.assert_called_once()
		self.service.update.assert_not_called()

	def test_create_rejects_invalid_configuration(self):
		cases = [
			{'name': 'bad type', 'type': 'category-measure', 'segments': []},
			{'name': 'blank segment', 'segments': [{'name': '', 'value': {'min': '0'}}]},
			{'name': 'bad number', 'segments': [{'name': 'a', 'value': {'min': 'abc'}}]},
			{'name': 'bad range', 'segments': [{'name': 'a', 'value': {'min': '2', 'max': '1'}}]},
			{'name': 'overlap', 'segments': [
				{'name': 'a', 'value': {'max': '10'}},
				{'name': 'b', 'value': {'min': '9', 'max': '20'}},
			]},
			{'name': 'duplicate name', 'segments': [
				{'name': 'a', 'value': {'max': '10'}},
				{'name': 'a', 'value': {'min': '10'}},
			]},
		]
		for body in cases:
			with self.subTest(body=body):
				response = self.client.post('/metricflow/buckets', json=body)
				self.assertEqual(400, response.status_code, response.text)
		self.service.create.assert_not_called()

	def test_update_preserves_type_measure_and_version(self):
		existing = make_bucket(type='value-measure', measure='age', version=3)
		self.service.is_storable_id_faked.return_value = False
		self.service.find_by_id.return_value = existing
		self.service.update.side_effect = lambda bucket: bucket
		body = make_bucket(type='value-measure', measure='age', version=3).model_dump()
		response = self.client.post('/metricflow/buckets', json=body)
		self.assertEqual(200, response.status_code, response.text)
		updated = self.service.update.call_args.args[0]
		self.assertEqual(3, updated.version)
		self.assertEqual('age', updated.measure)

		body['type'] = 'value'
		response = self.client.post('/metricflow/buckets', json=body)
		self.assertEqual(400, response.status_code)
		self.assertIn('type cannot be changed', response.json()['detail'])
		body['type'] = 'value-measure'
		body['measure'] = 'floor'
		response = self.client.post('/metricflow/buckets', json=body)
		self.assertEqual(400, response.status_code)
		self.assertIn('measure cannot be changed', response.json()['detail'])

	def test_update_and_get_enforce_tenant(self):
		self.service.is_storable_id_faked.return_value = False
		self.service.find_by_id.return_value = make_bucket(tenantId='another-tenant')
		response = self.client.post('/metricflow/buckets', json=make_bucket().model_dump())
		self.assertEqual(403, response.status_code)
		response = self.client.get('/metricflow/buckets/bucket-1')
		self.assertEqual(404, response.status_code)

	def test_page_uses_name_query_and_tenant(self):
		self.service.find_page_by_text.return_value = DataPage(
			data=[], itemCount=0, pageCount=0, pageNumber=1, pageSize=10)
		response = self.client.post(
			'/metricflow/buckets/page?query_name=sales', json={'pageNumber': 1, 'pageSize': 10})
		self.assertEqual(200, response.status_code, response.text)
		self.service.find_page_by_text.assert_called_once_with('sales', TENANT_ID, mock.ANY)

	def test_numeric_value_returns_both_supported_types_and_filters(self):
		self.service.find_all.return_value = [
			make_bucket(bucketId='value', name='Revenue value'),
			make_bucket(bucketId='measure', name='Revenue measure', type='value-measure', measure='age'),
			make_bucket(bucketId='other', name='Other', type='category-measure', measure='region', segments=[]),
		]
		response = self.client.get('/metricflow/buckets/numeric-value?query_name=revenue')
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual(['value', 'measure'], [item['bucketId'] for item in response.json()])
		self.service.find_all.assert_called_once_with(TENANT_ID)


if __name__ == '__main__':
	unittest.main()
