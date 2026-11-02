import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import TENANT_ID, build_client, console_principal
from watchmen_indicator_kernel.meta import BucketService
from watchmen_model.common import DataPage
from watchmen_model.indicator import Bucket, BucketType, CategorySegment, NumericValueSegment, \
	RangeBucketValueIncluding
from watchmen_metricflow.router import metric_bucket_router


def make_bucket(**overrides):
	data = {
		'bucketId': 'bucket-1',
		'name': 'Revenue bands',
		'type': 'value',
		'include': 'include-min',
		'tenantId': TENANT_ID,
		'version': 1,
		'createdAt': datetime(2024, 1, 1),
		'createdBy': 'user-1',
		'lastModifiedAt': datetime(2024, 1, 1),
		'lastModifiedBy': 'user-1',
		'segments': [
			{'name': 'low', 'value': {'max': '100'}},
			{'name': 'high', 'value': {'min': '100'}},
		],
	}
	data.update(overrides)
	segment_class = CategorySegment if data['type'] in ('category-measure', 'enum-measure') else NumericValueSegment
	data['segments'] = [segment_class(**segment) for segment in data['segments']]
	bucket = Bucket.model_construct(**data)
	bucket.include = data['include']
	if 'measure' in data:
		bucket.measure = data['measure']
	if 'enumId' in data:
		bucket.enumId = data['enumId']
	return bucket


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

	def test_create_supports_measure_bucket_types(self):
		self.service.redress_storable_id.side_effect = lambda bucket: bucket
		self.service.create.side_effect = lambda bucket: bucket
		cases = [
			{
				'name': 'Age bands', 'type': 'value-measure', 'measure': 'age',
				'segments': [{'name': 'adult', 'value': {'min': '18'}}],
			},
			{
				'name': 'Regions', 'type': 'category-measure', 'measure': 'region',
				'segments': [
					{'name': 'APAC', 'value': ['CN', 'JP']},
					{'name': 'Other', 'value': ['&others']},
				],
			},
			{
				'name': 'Levels', 'type': 'enum-measure', 'measure': 'enum', 'enumId': 'enum-1',
				'segments': [{'name': 'High', 'value': ['A', 'B']}],
			},
		]
		for body in cases:
			with self.subTest(type=body['type']):
				response = self.client.post('/metricflow/buckets', json=body)
				self.assertEqual(200, response.status_code, response.text)
				self.assertEqual(body['type'], response.json()['type'])
				self.assertEqual(body['measure'], response.json()['measure'])
				if 'enumId' in body:
					self.assertEqual(body['enumId'], response.json()['enumId'])
		self.assertEqual(len(cases), self.service.create.call_count)

	def test_create_rejects_invalid_configuration(self):
		category_segments = [{'name': 'a', 'value': ['x']}]
		cases = [
			{
				'name': 'bad value measure', 'type': 'value-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': {'min': '0'}}],
			},
			{
				'name': 'bad category measure', 'type': 'category-measure', 'measure': 'age',
				'segments': category_segments,
			},
			{
				'name': 'bad enum measure', 'type': 'enum-measure', 'measure': 'age', 'enumId': 'enum-1',
				'segments': category_segments,
			},
			{
				'name': 'missing enum id', 'type': 'enum-measure', 'measure': 'enum',
				'segments': category_segments,
			},
			{
				'name': 'empty category values', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': []}],
			},
			{
				'name': 'category value not array', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': 'x'}],
			},
			{
				'name': 'blank category value', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': [' ']}],
			},
			{
				'name': 'non-string category value', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': [1]}],
			},
			{
				'name': 'duplicate within segment', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': ['x', 'x']}],
			},
			{
				'name': 'duplicate across segments', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': ['x']}, {'name': 'b', 'value': ['x']}],
			},
			{
				'name': 'mixed others', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': ['x', '&others']}],
			},
			{
				'name': 'duplicate category name', 'type': 'category-measure', 'measure': 'region',
				'segments': [{'name': 'a', 'value': ['x']}, {'name': 'a', 'value': ['y']}],
			},
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
		body = make_bucket(type='value-measure', measure='age', version=3).model_dump(mode='json', exclude_none=True)
		body['include'] = 'include-min'
		body['measure'] = 'age'
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

	def test_update_locks_enum_id(self):
		segments = [{'name': 'High', 'value': ['A']}]
		existing = make_bucket(
			type='enum-measure', measure='enum', enumId='enum-1', segments=segments)
		self.service.is_storable_id_faked.return_value = False
		self.service.find_by_id.return_value = existing
		body = make_bucket(
			type='enum-measure', measure='enum', enumId='enum-1', segments=segments
		).model_dump(mode='json', exclude_none=True)
		body['measure'] = 'enum'
		body['enumId'] = 'enum-2'
		response = self.client.post('/metricflow/buckets', json=body)
		self.assertEqual(400, response.status_code, response.text)
		self.assertIn('enumId cannot be changed', response.json()['detail'])
		self.service.update.assert_not_called()

	def test_get_returns_bucket_with_numeric_configuration(self):
		self.service.find_by_id.return_value = make_bucket(type='value-measure', measure='age')
		response = self.client.get('/metricflow/buckets/bucket-1')
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual('include-min', response.json()['include'])
		self.assertEqual('age', response.json()['measure'])
		self.service.find_by_id.assert_called_once_with('bucket-1')

	def test_update_and_get_enforce_tenant(self):
		self.service.is_storable_id_faked.return_value = False
		self.service.find_by_id.return_value = make_bucket(tenantId='another-tenant')
		response = self.client.post('/metricflow/buckets', json=make_bucket().model_dump(mode='json', exclude_none=True))
		self.assertEqual(403, response.status_code)
		response = self.client.get('/metricflow/buckets/bucket-1')
		self.assertEqual(404, response.status_code)

	def test_page_uses_name_query_and_tenant(self):
		self.service.find_page_by_text.return_value = DataPage(
			data=[], itemCount=0, pageCount=0, pageNumber=1, pageSize=10)
		response = self.client.post(
			'/metricflow/buckets/page?query_name=sales', json={'pageNumber': 1, 'pageSize': 10})
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual((
			BucketType.VALUE, BucketType.VALUE_MEASURE, BucketType.CATEGORY_MEASURE, BucketType.ENUM_MEASURE),
			metric_bucket_router.SUPPORTED_BUCKET_TYPES)
		self.service.find_page_by_text.assert_called_once_with(
			'sales', TENANT_ID, mock.ANY, metric_bucket_router.SUPPORTED_BUCKET_TYPES)

	def test_numeric_value_returns_both_supported_types_and_filters(self):
		self.service.find_all.return_value = [
			make_bucket(bucketId='value', name='Revenue value'),
			make_bucket(bucketId='measure', name='Revenue measure', type='value-measure', measure='age'),
			make_bucket(
				bucketId='category', name='Revenue category', type='category-measure', measure='region', segments=[]),
			make_bucket(
				bucketId='enum', name='Revenue enum', type='enum-measure', measure='enum', enumId='enum-1',
				segments=[]),
		]
		response = self.client.get('/metricflow/buckets/numeric-value?query_name=revenue')
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual(['value', 'measure'], [item['bucketId'] for item in response.json()])
		self.service.find_all.assert_called_once_with(TENANT_ID)

	def test_value_measure_include_survives_storage_shaper(self):
		from watchmen_indicator_kernel.meta.bucket_service import BUCKET_ENTITY_SHAPER
		from watchmen_model.indicator import MeasureMethod
		bucket = metric_bucket_router.MetricBucket(
			bucketId='bucket-1', name='Revenue bands', tenantId=TENANT_ID,
			type=BucketType.VALUE_MEASURE, measure=MeasureMethod.AGE,
			include=RangeBucketValueIncluding.INCLUDE_MAX,
			segments=[NumericValueSegment(name='high', value={'min': '100'})])
		row = BUCKET_ENTITY_SHAPER.serialize(bucket)
		self.assertEqual(RangeBucketValueIncluding.INCLUDE_MAX, row['include'])

	def test_numeric_bucket_deserializes_storage_row(self):
		from watchmen_indicator_kernel.meta.bucket_service import BUCKET_ENTITY_SHAPER
		from watchmen_model.indicator import NumericValueBucket
		bucket = metric_bucket_router.MetricBucket(
			bucketId='bucket-1', name='Revenue bands', tenantId=TENANT_ID,
			createdAt=datetime(2024, 1, 1), createdBy='user-1',
			lastModifiedAt=datetime(2024, 1, 1), lastModifiedBy='user-1',
			type=BucketType.VALUE, include=RangeBucketValueIncluding.INCLUDE_MIN,
			segments=[
				NumericValueSegment(name='A', value={'min': '2', 'max': '3'}),
				NumericValueSegment(name='B', value={'min': '3', 'max': '5'})
			])
		deserialized = BUCKET_ENTITY_SHAPER.deserialize(BUCKET_ENTITY_SHAPER.serialize(bucket))
		self.assertIsInstance(deserialized, NumericValueBucket)
		self.assertEqual(BucketType.VALUE, deserialized.type)
		self.assertEqual('2', deserialized.segments[0].value.min)
		self.assertEqual('5', deserialized.segments[1].value.max)


if __name__ == '__main__':
	unittest.main()
