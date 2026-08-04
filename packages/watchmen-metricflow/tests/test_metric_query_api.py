"""Tests for the metric query router (metric_router).

Covers health check, metric listing, dimension lookup, and metric value
query.  dbt-metricflow and MySQL bypass paths are both exercised via
mock patches so no real database or dbt runtime is required.
"""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import build_client
from watchmen_metricflow.router import metric_router
from watchmen_metricflow.router.metric_router import MetricFlowResponse
from watchmen_metricflow.model.dimension_response import (
    DimensionListResponse,
    DimensionInfo,
    MetricListResponse,
    MetricInfo,
)


# --------------------------------------------------------------------------- #
# Simple endpoints
# --------------------------------------------------------------------------- #

class TestHealthAndDate(unittest.TestCase):
    def test_health_check(self):
        client = build_client(metric_router.router)
        response = client.get('/metricflow/health')
        self.assertEqual(200, response.status_code)
        self.assertEqual({'status': 'ok'}, response.json())

    def test_get_current_date(self):
        client = build_client(metric_router.router)
        response = client.get('/metricflow/current_date')
        self.assertEqual(200, response.status_code)
        # returns a date string
        self.assertIsNotNone(response.json())


# --------------------------------------------------------------------------- #
# List metrics
# --------------------------------------------------------------------------- #

class TestListMetrics(unittest.TestCase):
    def test_list_metrics(self):
        expected = MetricListResponse(
            metrics=[
                MetricInfo(name='revenue', type='simple', label='Revenue'),
                MetricInfo(name='orders', type='simple'),
            ],
            total_count=2)
        with mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(metric_router, 'find_all_metrics', return_value=expected):
            client = build_client(metric_router.router)
            response = client.get('/metricflow/list_metrics')
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(2, body['total_count'])
        self.assertEqual('revenue', body['metrics'][0]['name'])


# --------------------------------------------------------------------------- #
# Dimensions
# --------------------------------------------------------------------------- #

class TestFindDimensions(unittest.TestCase):
    def _expected_dims(self):
        return DimensionListResponse(
            dimensions=[
                DimensionInfo(name='region', qualified_name='sm__region', type='CATEGORICAL'),
                DimensionInfo(name='order_date', qualified_name='sm__order_date', type='TIME'),
            ],
            total_count=2)

    def test_find_dimensions_by_metric_via_mysql_bypass(self):
        expected = self._expected_dims()
        with mock.patch.object(
                metric_router, 'try_mysql_dimensions_by_metrics',
                mock.AsyncMock(return_value=expected)):
            client = build_client(metric_router.router)
            response = client.get('/metricflow/dimensions_by_metric?metric_name=revenue')
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(2, body['total_count'])
        self.assertEqual('region', body['dimensions'][0]['name'])

    def test_find_dimensions_by_metric_fallback_to_dbt(self):
        expected = self._expected_dims()
        with mock.patch.object(
                metric_router, 'try_mysql_dimensions_by_metrics',
                mock.AsyncMock(return_value=None)), \
                mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(metric_router, 'load_dimensions_by_metrics', return_value=expected):
            client = build_client(metric_router.router)
            response = client.get('/metricflow/dimensions_by_metric?metric_name=revenue')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, response.json()['total_count'])

    def test_find_dimensions_post_via_mysql_bypass(self):
        expected = self._expected_dims()
        with mock.patch.object(
                metric_router, 'try_mysql_dimensions_by_metrics',
                mock.AsyncMock(return_value=expected)):
            client = build_client(metric_router.router)
            response = client.post('/metricflow/find_dimensions', json=['revenue', 'orders'])
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, response.json()['total_count'])

    def test_find_dimensions_post_fallback_to_dbt(self):
        expected = self._expected_dims()
        with mock.patch.object(
                metric_router, 'try_mysql_dimensions_by_metrics',
                mock.AsyncMock(return_value=None)), \
                mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(metric_router, 'load_dimensions_by_metrics', return_value=expected):
            client = build_client(metric_router.router)
            response = client.post('/metricflow/find_dimensions', json=['revenue'])
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, response.json()['total_count'])


# --------------------------------------------------------------------------- #
# Metric value query
# --------------------------------------------------------------------------- #

class TestGetMetricValue(unittest.TestCase):
    def _expected_response(self):
        return MetricFlowResponse(
            data=(('APAC', 100), ('EMEA', 200)),
            column_names=['region', 'revenue'])

    def test_get_metric_value_via_mysql_bypass(self):
        expected = self._expected_response()
        with mock.patch.object(
                metric_router, 'try_mysql_metric_query',
                mock.AsyncMock(return_value=expected)):
            client = build_client(metric_router.router)
            response = client.post(
                '/metricflow/get_metric_value',
                json={'metric': 'revenue', 'group_by': ['region']})
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(['region', 'revenue'], body['column_names'])
        self.assertEqual([['APAC', 100], ['EMEA', 200]], body['data'])

    def test_get_metric_value_fallback_to_dbt(self):
        mock_result = SimpleNamespace()
        mock_result.result_df = SimpleNamespace(
            rows=(('APAC', 100),),
            column_names=['region', 'revenue'])
        with mock.patch.object(
                metric_router, 'try_mysql_metric_query',
                mock.AsyncMock(return_value=None)), \
                mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(metric_router, 'query', return_value=mock_result):
            client = build_client(metric_router.router)
            response = client.post(
                '/metricflow/get_metric_value',
                json={'metric': 'revenue', 'group_by': ['region']})
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(['region', 'revenue'], body['column_names'])

    def test_get_metric_value_with_time_range(self):
        expected = self._expected_response()
        with mock.patch.object(
                metric_router, 'try_mysql_metric_query',
                mock.AsyncMock(return_value=expected)):
            client = build_client(metric_router.router)
            response = client.post(
                '/metricflow/get_metric_value',
                json={
                    'metric': 'revenue',
                    'group_by': ['region'],
                    'start_time': '2024-01-01T00:00:00',
                    'end_time': '2024-03-01T00:00:00'})
        self.assertEqual(200, response.status_code)


# --------------------------------------------------------------------------- #
# Batch query
# --------------------------------------------------------------------------- #

class TestQueryMetrics(unittest.TestCase):
    def test_query_metrics_batch_via_mysql_bypass(self):
        expected = MetricFlowResponse(
            data=(('APAC', 100),),
            column_names=['region', 'revenue'])
        with mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(
                    metric_router, 'try_mysql_metric_query',
                    mock.AsyncMock(return_value=expected)):
            client = build_client(metric_router.router)
            response = client.post('/metricflow/query_metrics', json=[
                {'metric': 'revenue', 'group_by': ['region']},
                {'metric': 'orders', 'group_by': ['region']},
            ])
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))

    def test_query_metrics_batch_fallback_to_dbt(self):
        mock_result = SimpleNamespace()
        mock_result.result_df = SimpleNamespace(
            rows=(('APAC', 100),),
            column_names=['region', 'revenue'])
        with mock.patch.object(metric_router, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(
                    metric_router, 'try_mysql_metric_query',
                    mock.AsyncMock(return_value=None)), \
                mock.patch.object(metric_router, 'query', return_value=mock_result):
            client = build_client(metric_router.router)
            response = client.post('/metricflow/query_metrics', json=[
                {'metric': 'revenue', 'group_by': ['region']},
            ])
        self.assertEqual(200, response.status_code)
        self.assertEqual(1, len(response.json()))


# --------------------------------------------------------------------------- #
# build_merged_profile helper
# --------------------------------------------------------------------------- #

class TestBuildMergedProfile(unittest.TestCase):
    """Direct unit tests for the profile merge helper."""

    def test_too_many_data_sources_raises_400(self):
        from watchmen_metricflow.model.semantic import SemanticModel
        from watchmen_metricflow.router.metric_router import build_merged_profile
        from _metric_test_base import admin_principal
        # three models each pointing at a different host -> 3 distinct connections
        models = []
        for i in range(3):
            models.append(SemanticModel(**{
                'name': f'm{i}', 'description': 'd', 'sourceType': 'db_source',
                'node_relation': {
                    'alias': 'a', 'schema_name': 's', 'database': 'db',
                    'relation_name': 'r', 'databaseType': 'pgsql',
                    'host': f'host-{i}', 'username': 'u', 'password': 'p', 'port': 5432},
                'entities': [], 'measures': [], 'dimensions': []}))
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            build_merged_profile(models, admin_principal())
        self.assertEqual(400, ctx.exception.status_code)

    def test_no_data_sources_returns_none(self):
        # empty model list -> no profiles -> None
        result = metric_router.build_merged_profile([], None)
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()
