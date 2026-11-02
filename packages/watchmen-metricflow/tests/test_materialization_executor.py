"""Tests for applying value bucket snapshots to materialization query results."""
import asyncio
import sys
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import admin_principal, make_materialization
from watchmen_model.indicator import Bucket, NumericValueSegment
from watchmen_metricflow.model.metric_response import MetricFlowResponse
from watchmen_metricflow.service import materialization_executor
from watchmen_metricflow.service.materialization_executor import execute_metric_query


def make_bucket(version=1):
    bucket = Bucket.model_construct(
        bucketId='bucket-1', name='Revenue bands', type='value', version=version,
        segments=[NumericValueSegment(name='low', value={'max': '10'})])
    bucket.include = 'include-min'
    return bucket


class TestExecuteMetricQueryValueBucket(unittest.TestCase):
    def _materialization(self):
        return make_materialization(
            metricName='sales_amount', groupBy=['region'], valueBucketId='bucket-1', engine='STORAGE')

    def _response(self):
        return MetricFlowResponse(
            data=((date(2026, 9, 30), 'east', 5),),
            column_names=['metric_time__day', 'region', 'sales_amount'])

    def test_direct_response_uses_supplied_snapshot_without_reloading(self):
        bucket = make_bucket()
        with mock.patch.object(materialization_executor, 'check_metric_names_allowed'), \
                mock.patch.object(materialization_executor, 'get_metric_service'), \
                mock.patch.object(
                    materialization_executor, 'try_direct_metric_query',
                    mock.AsyncMock(return_value=self._response())), \
                mock.patch.object(materialization_executor, 'load_value_bucket') as load_bucket:
            outcome = asyncio.run(execute_metric_query(
                self._materialization(), admin_principal(),
                window=(date(2026, 9, 30), date(2026, 9, 30)), value_bucket=bucket))

        self.assertEqual(
            ['metric_time__day', 'region', 'valueBucket', 'sales_amount'], outcome.column_names)
        self.assertEqual([(date(2026, 9, 30), 'east', 'low', 5)], outcome.rows)
        load_bucket.assert_not_called()

    def test_dbt_response_uses_supplied_snapshot_without_reloading(self):
        bucket = make_bucket()
        query_result = SimpleNamespace(result_df=SimpleNamespace(
            rows=self._response().data, column_names=self._response().column_names))
        with mock.patch.object(materialization_executor, 'check_metric_names_allowed'), \
                mock.patch.object(materialization_executor, 'get_metric_service'), \
                mock.patch.object(
                    materialization_executor, 'try_direct_metric_query',
                    mock.AsyncMock(return_value=None)), \
                mock.patch.object(
                    materialization_executor, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(materialization_executor, 'ensure_dbt_path'), \
                mock.patch.object(materialization_executor, 'dbt_query', return_value=query_result), \
                mock.patch.object(materialization_executor, 'load_value_bucket') as load_bucket:
            outcome = asyncio.run(execute_metric_query(
                self._materialization(), admin_principal(),
                window=(date(2026, 9, 30), date(2026, 9, 30)), value_bucket=bucket))

        self.assertEqual(
            ['metric_time__day', 'region', 'valueBucket', 'sales_amount'], outcome.column_names)
        self.assertEqual([(date(2026, 9, 30), 'east', 'low', 5)], outcome.rows)
        load_bucket.assert_not_called()


if __name__ == '__main__':
    unittest.main()
