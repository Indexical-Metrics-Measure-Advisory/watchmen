import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import build_client
from watchmen_model.indicator import Bucket
from watchmen_metricflow.model.metric_response import MetricFlowResponse
from watchmen_metricflow.router import metric_router
from watchmen_metricflow.service import metric_value_bucket_service


def make_bucket():
	return Bucket(
		bucketId='bucket-1', name='Revenue bands', type='value', include='include-min',
		segments=[
			{'name': 'low', 'value': {'max': '100'}},
			{'name': 'high', 'value': {'min': '100'}},
		])


def make_dbt_result(rows=(('APAC', 100),)):
	return SimpleNamespace(result_df=SimpleNamespace(rows=rows, column_names=['region', 'revenue']))


class TestMetricValueBucketQueryApi(unittest.TestCase):
	def test_single_direct_response(self):
		direct = MetricFlowResponse(
			data=(('APAC', 100), ('EMEA', 10)), column_names=['region', 'revenue'])
		with mock.patch.object(metric_router, 'check_metric_names_allowed'), \
				mock.patch.object(metric_router, 'try_direct_metric_query', mock.AsyncMock(return_value=direct)), \
				mock.patch.object(metric_value_bucket_service, 'ask_bucket', return_value=make_bucket()):
			response = build_client(metric_router.router).post('/metricflow/get_metric_value', json={
				'metric': 'revenue', 'group_by': ['region'], 'value_bucket_id': 'bucket-1'})
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual(['region', 'valueBucket', 'revenue'], response.json()['column_names'])
		self.assertEqual([['APAC', 'high', 100], ['EMEA', 'low', 10]], response.json()['data'])

	def test_single_dbt_response(self):
		with mock.patch.object(metric_router, 'check_metric_names_allowed'), \
				mock.patch.object(metric_router, 'try_direct_metric_query', mock.AsyncMock(return_value=None)), \
				mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
				mock.patch.object(metric_router, 'query', return_value=make_dbt_result()) as query, \
				mock.patch.object(metric_value_bucket_service, 'ask_bucket', return_value=make_bucket()):
			response = build_client(metric_router.router).post('/metricflow/get_metric_value', json={
				'metric': 'revenue', 'group_by': ['region'], 'value_bucket_id': 'bucket-1'})
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual(['region', 'valueBucket', 'revenue'], response.json()['column_names'])
		self.assertEqual([['APAC', 'high', 100]], response.json()['data'])
		self.assertEqual(['region'], query.call_args.kwargs['group_by'])

	def test_batch_direct_responses(self):
		direct = MetricFlowResponse(data=(('APAC', 100),), column_names=['region', 'revenue'])
		with mock.patch.object(metric_router, 'check_metric_names_allowed'), \
				mock.patch.object(metric_router, 'try_direct_metric_query', mock.AsyncMock(return_value=direct)), \
				mock.patch.object(metric_value_bucket_service, 'ask_bucket', return_value=make_bucket()):
			response = build_client(metric_router.router).post('/metricflow/query_metrics', json=[
				{'metric': 'revenue', 'group_by': ['region'], 'value_bucket_id': 'bucket-1'},
				{'metric': 'revenue', 'group_by': ['region'], 'value_bucket_id': 'bucket-1'},
			])
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual(2, len(response.json()))
		for item in response.json():
			self.assertEqual(['region', 'valueBucket', 'revenue'], item['column_names'])
			self.assertEqual([['APAC', 'high', 100]], item['data'])

	def test_batch_dbt_response(self):
		with mock.patch.object(metric_router, 'check_metric_names_allowed'), \
				mock.patch.object(metric_router, 'try_direct_metric_query', mock.AsyncMock(return_value=None)), \
				mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
				mock.patch.object(metric_router, 'query', return_value=make_dbt_result()) as query, \
				mock.patch.object(metric_value_bucket_service, 'ask_bucket', return_value=make_bucket()):
			response = build_client(metric_router.router).post('/metricflow/query_metrics', json=[
				{'metric': 'revenue', 'group_by': ['region'], 'value_bucket_id': 'bucket-1'},
			])
		self.assertEqual(200, response.status_code, response.text)
		self.assertEqual(['region', 'valueBucket', 'revenue'], response.json()[0]['column_names'])
		self.assertEqual([['APAC', 'high', 100]], response.json()[0]['data'])
		self.assertEqual(['region'], query.call_args.kwargs['group_by'])


if __name__ == '__main__':
	unittest.main()
