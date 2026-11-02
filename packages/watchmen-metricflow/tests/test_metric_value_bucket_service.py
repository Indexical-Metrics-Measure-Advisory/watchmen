import sys
import unittest
from decimal import Decimal
from pathlib import Path
from unittest import mock

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import admin_principal
from watchmen_model.indicator import Bucket, NumericValueSegment
from watchmen_metricflow.model.metric_response import MetricFlowResponse
from watchmen_metricflow.service import metric_value_bucket_service
from watchmen_metricflow.service.metric_value_bucket_service import apply_value_bucket, \
	apply_value_bucket_to_response, classify_value


def make_bucket(include='include-min', **overrides):
	data = {
		'bucketId': 'bucket-1',
		'name': 'Revenue bands',
		'type': 'value',
		'include': include,
		'segments': [
			{'name': 'low', 'value': {'max': '10'}},
			{'name': 'middle', 'value': {'min': '10', 'max': '20'}},
			{'name': 'high', 'value': {'min': '20'}},
		],
	}
	data.update(overrides)
	data['segments'] = [NumericValueSegment(**segment) for segment in data['segments']]
	bucket = Bucket.model_construct(**data)
	bucket.include = data['include']
	if 'measure' in data:
		bucket.measure = data['measure']
	return bucket


class TestClassifyValue(unittest.TestCase):
	def test_include_min_boundaries_null_and_unmatched(self):
		bucket = make_bucket(segments=[
			{'name': 'low', 'value': {'min': '0', 'max': '10'}},
			{'name': 'high', 'value': {'min': '10', 'max': '20'}},
		])
		self.assertEqual('low', classify_value(0, bucket))
		self.assertEqual('low', classify_value('9.999', bucket))
		self.assertEqual('high', classify_value(10, bucket))
		self.assertEqual('high', classify_value('19.999', bucket))
		self.assertEqual('-', classify_value(20, bucket))
		self.assertEqual('-', classify_value(None, bucket))
		self.assertEqual('-', classify_value('not-a-number', bucket))

	def test_include_max_boundaries(self):
		bucket = make_bucket(include='include-max')
		self.assertEqual('low', classify_value(10, bucket))
		self.assertEqual('middle', classify_value('10.001', bucket))
		self.assertEqual('middle', classify_value(20, bucket))
		self.assertEqual('high', classify_value('20.001', bucket))

	def test_open_ranges_and_segment_order(self):
		bucket = make_bucket()
		self.assertEqual('low', classify_value('-999999', bucket))
		self.assertEqual('high', classify_value('999999', bucket))
		overlapping = make_bucket(segments=[
			{'name': 'first', 'value': {'min': '0', 'max': '10'}},
			{'name': 'second', 'value': {'min': '0', 'max': '10'}},
		])
		self.assertEqual('first', classify_value(5, overlapping))

	def test_decimal_conversion_and_value_measure(self):
		bucket = make_bucket(type='value-measure', measure='age', segments=[
			{'name': 'precise', 'value': {'min': '0.1', 'max': '0.2'}},
		])
		self.assertEqual('precise', classify_value(Decimal('0.10000000000000000001'), bucket))

	def test_invalid_type_is_clear_error(self):
		bucket = make_bucket(type='category-measure', measure='region', segments=[])
		with self.assertRaises(HTTPException) as context:
			classify_value(1, bucket)
		self.assertEqual(400, context.exception.status_code)
		self.assertIn('not supported', context.exception.detail)


class TestMetricValueBucketResponse(unittest.TestCase):
	def test_inserts_value_bucket_before_real_metric_column(self):
		response = MetricFlowResponse(
			data=(('APAC', 5, 'x'), ('EMEA', 15, 'y')),
			column_names=['region', 'revenue', 'note'])
		result = apply_value_bucket_to_response(response, make_bucket(), 'revenue')
		self.assertEqual(['region', 'valueBucket', 'revenue', 'note'], result.column_names)
		self.assertEqual((('APAC', 'low', 5, 'x'), ('EMEA', 'middle', 15, 'y')), result.data)
		self.assertEqual(['region', 'revenue', 'note'], response.column_names)

	def test_column_conflict_and_missing_metric_are_clear_errors(self):
		conflict = MetricFlowResponse(data=((1, 'low'),), column_names=['revenue', 'valueBucket'])
		with self.assertRaises(HTTPException) as context:
			apply_value_bucket_to_response(conflict, make_bucket(), 'revenue')
		self.assertEqual(400, context.exception.status_code)
		self.assertIn('reserved column', context.exception.detail)
		missing = MetricFlowResponse(data=((1,),), column_names=['orders'])
		with self.assertRaises(HTTPException) as context:
			apply_value_bucket_to_response(missing, make_bucket(), 'revenue')
		self.assertEqual(400, context.exception.status_code)
		self.assertIn('not found', context.exception.detail)

	def test_unconfigured_response_is_unchanged_without_storage_read(self):
		response = MetricFlowResponse(data=((1,),), column_names=['revenue'])
		with mock.patch.object(metric_value_bucket_service, 'ask_bucket') as ask_bucket:
			result = apply_value_bucket(response, None, 'revenue', admin_principal())
		self.assertIs(response, result)
		ask_bucket.assert_not_called()

	def test_loads_bucket_for_current_principal(self):
		response = MetricFlowResponse(data=((5,),), column_names=['revenue'])
		principal = admin_principal()
		with mock.patch.object(metric_value_bucket_service, 'ask_bucket', return_value=make_bucket()) as ask_bucket:
			result = apply_value_bucket(response, 'bucket-1', 'revenue', principal)
		self.assertEqual('low', result.data[0][0])
		ask_bucket.assert_called_once_with('bucket-1', principal)


if __name__ == '__main__':
	unittest.main()
