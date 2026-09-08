"""Tests for the alert / subscription metric value lookup over the direct bypass.

Covers: a bypass-enabled metric is served without touching the dbt runtime
(the previous failure: cfg.setup() raised when every data source was
bypass-enabled); a non-bypass metric still falls back to dbt; a bypass error
degrades to the dbt path instead of failing the alert run.
"""
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))

from fastapi import HTTPException

from watchmen_metricflow.model.alert_rule import AlertCondition, AlertOperator
from watchmen_metricflow.router.metric_router import MetricFlowResponse
from watchmen_metricflow.service import alert_trigger_servcie as alert_svc
from watchmen_metricflow.service.alert_trigger_servcie import AlertTriggerService


def _principal():
    principal = mock.MagicMock()
    principal.get_tenant_id.return_value = 't-alert'
    return principal


def _service():
    with mock.patch.multiple(
            'watchmen_metricflow.service.alert_trigger_servcie',
            ask_meta_storage=mock.DEFAULT, ask_snowflake_generator=mock.DEFAULT,
            AlertRuleService=mock.DEFAULT, AlertInstanceService=mock.DEFAULT,
            BIAnalysisService=mock.DEFAULT, SubscriptionService=mock.DEFAULT,
            MetricService=mock.DEFAULT, SuggestedActionService=mock.DEFAULT,
            ActionTypeService=mock.DEFAULT, build_alert_hook_dispatcher=mock.DEFAULT):
        return AlertTriggerService(_principal())


def _metric(name='alert_metric'):
    return SimpleNamespace(id='m-1', name=name)


class TestAlertMetricValueDirectBypass(unittest.TestCase):
    def _run_get_value(self, direct_result, direct_raises=None):
        service = _service()
        direct_mock = mock.AsyncMock(return_value=direct_result)
        if direct_raises is not None:
            direct_mock.side_effect = direct_raises
        query_mock = mock.MagicMock(return_value=SimpleNamespace(
            result_df=SimpleNamespace(rows=[(41.0,)], column_names=['v'])))
        with mock.patch.object(alert_svc, 'try_direct_metric_query', direct_mock), \
                mock.patch.object(alert_svc, 'build_metric_config', mock.AsyncMock()), \
                mock.patch.object(alert_svc, 'query', query_mock):
            value = asyncio_run(service._get_metric_value('alert_metric'))
        return value, direct_mock, query_mock

    def test_bypass_result_is_used_without_dbt(self):
        result = MetricFlowResponse(data=((42.5,),), column_names=['alert_metric'])
        value, direct_mock, query_mock = self._run_get_value(result)
        self.assertEqual(42.5, value)
        direct_mock.assert_awaited_once()
        query_mock.assert_not_called()

    def test_empty_bypass_result_returns_zero_without_dbt(self):
        result = MetricFlowResponse(data=(), column_names=['alert_metric'])
        value, _, query_mock = self._run_get_value(result)
        self.assertEqual(0.0, value)
        query_mock.assert_not_called()

    def test_non_bypass_metric_falls_back_to_dbt(self):
        value, direct_mock, query_mock = self._run_get_value(None)
        self.assertEqual(41.0, value)
        direct_mock.assert_awaited_once()
        query_mock.assert_called_once()

    def test_bypass_error_degrades_to_dbt(self):
        value, _, query_mock = self._run_get_value(
            None, direct_raises=HTTPException(status_code=400, detail='boom'))
        self.assertEqual(41.0, value)
        query_mock.assert_called_once()

    def test_evaluate_condition_reads_bypass_value(self):
        service = _service()
        metric = _metric()
        service.metric_service = mock.MagicMock()
        service.metric_service.find_by_id.return_value = metric
        condition = AlertCondition(metricId='m-1', operator=AlertOperator.GT, value=40)
        with mock.patch.object(
                AlertTriggerService, '_get_metric_value',
                mock.AsyncMock(return_value=42.0)):
            import asyncio
            result = asyncio.run(service._evaluate_condition_async(condition))
        self.assertTrue(result.triggered)
        self.assertEqual(42.0, result.currentValue)


def asyncio_run(coro):
    import asyncio
    return asyncio.run(coro)


if __name__ == '__main__':
    unittest.main()
