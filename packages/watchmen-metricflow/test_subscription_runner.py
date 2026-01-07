import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
from datetime import datetime, timedelta

# Add src to path
sys.path.append(os.path.abspath("src"))
sys.path.append(os.path.abspath("../watchmen-model/src"))
sys.path.append(os.path.abspath("../watchmen-meta/src"))
sys.path.append(os.path.abspath("../watchmen-auth/src"))
sys.path.append(os.path.abspath("../watchmen-utilities/src"))
sys.path.append(os.path.abspath("../watchmen-storage/src"))

# Mock dependencies before import
sys.modules["watchmen_meta.common"] = MagicMock()
sys.modules["watchmen_meta.common"].ask_meta_storage = MagicMock()
sys.modules["watchmen_meta.common"].ask_snowflake_generator = MagicMock()
sys.modules["watchmen_meta.common"].ask_datasource_aes_params = MagicMock(return_value=("key", "iv"))

# Mock watchmen_indicator_surface
sys.modules["watchmen_indicator_surface"] = MagicMock()
sys.modules["watchmen_indicator_surface.util"] = MagicMock()

# Mock watchmen_rest
sys.modules["watchmen_rest"] = MagicMock()

# Mock watchmen_data_kernel
sys.modules["watchmen_data_kernel"] = MagicMock()
sys.modules["watchmen_data_kernel.cache"] = MagicMock()

# Mock dbt_metricflow
sys.modules["dbt_metricflow"] = MagicMock()
sys.modules["dbt_metricflow.cli"] = MagicMock()
sys.modules["dbt_metricflow.cli.cli_configuration"] = MagicMock()
sys.modules["dbt_metricflow.cli.dbt_connectors"] = MagicMock()
sys.modules["dbt_metricflow.cli.dbt_connectors.adapter_backed_client"] = MagicMock()
sys.modules["dbt_metricflow.cli.dbt_connectors.dbt_config_accessor"] = MagicMock()

# Mock metricflow
sys.modules["metricflow"] = MagicMock()
sys.modules["metricflow.engine"] = MagicMock()
sys.modules["metricflow.engine.metricflow_engine"] = MagicMock()
sys.modules["metricflow.engine.models"] = MagicMock()
sys.modules["metricflow.data_table"] = MagicMock()
sys.modules["metricflow.data_table.column_types"] = MagicMock()
sys.modules["metricflow.protocols"] = MagicMock()
sys.modules["metricflow.protocols.sql_client"] = MagicMock()

# Mock dbt
sys.modules["dbt"] = MagicMock()
sys.modules["dbt.task"] = MagicMock()
sys.modules["dbt.task.debug"] = MagicMock()
sys.modules["dbt.adapters"] = MagicMock()
sys.modules["dbt.adapters.factory"] = MagicMock()
sys.modules["dbt.config"] = MagicMock()
sys.modules["dbt.config.renderer"] = MagicMock()
sys.modules["dbt.adapters.contracts"] = MagicMock()
sys.modules["dbt.adapters.contracts.connection"] = MagicMock()
sys.modules["dbt.flags"] = MagicMock()

# Mock dbt_semantic_interfaces
sys.modules["dbt_semantic_interfaces"] = MagicMock()
sys.modules["dbt_semantic_interfaces.protocols"] = MagicMock()

# Mock metricflow_semantics
sys.modules["metricflow_semantics"] = MagicMock()
sys.modules["metricflow_semantics.model"] = MagicMock()
sys.modules["metricflow_semantics.model.dbt_manifest_parser"] = MagicMock()

# Mock CLIConfigurationDB to avoid typing issues
mock_config_db_module = MagicMock()
class MockCLIConfigurationDB:
    pass
mock_config_db_module.CLIConfigurationDB = MockCLIConfigurationDB
sys.modules["watchmen_metricflow.metricflow.config.db_version.cli_configuration_db"] = mock_config_db_module

# Now import
from watchmen_metricflow.service.subscription_runner import SubscriptionRunner
from watchmen_metricflow.model.metric_subscription import Subscription, SubscriptionFrequency
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIChartCard, BIChartCardSelection
from watchmen_metricflow.model.metrics import Metric

class TestSubscriptionRunner(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.principal_service = MagicMock()
        self.principal_service.get_tenant_id.return_value = "tenant_1"
        
        # Patch dependencies
        self.patcher_sub = patch("watchmen_metricflow.service.subscription_runner.SubscriptionService")
        self.patcher_bi = patch("watchmen_metricflow.service.subscription_runner.BIAnalysisService")
        self.patcher_metric = patch("watchmen_metricflow.service.subscription_runner.MetricService")
        self.patcher_query = patch("watchmen_metricflow.service.subscription_runner.query")
        self.patcher_build_config = patch("watchmen_metricflow.service.subscription_runner.build_metric_config")
        self.patcher_trans = patch("watchmen_metricflow.service.subscription_runner.trans_readonly")
        
        self.MockSubscriptionService = self.patcher_sub.start()
        self.MockBIAnalysisService = self.patcher_bi.start()
        self.MockMetricService = self.patcher_metric.start()
        self.mock_query = self.patcher_query.start()
        self.mock_build_config = self.patcher_build_config.start()
        self.mock_trans = self.patcher_trans.start()
        
        # Setup mock instances
        self.mock_sub_service = self.MockSubscriptionService.return_value
        self.mock_bi_service = self.MockBIAnalysisService.return_value
        self.mock_metric_service = self.MockMetricService.return_value
        
        # Mock trans_readonly to execute the action immediately
        self.mock_trans.side_effect = lambda service, action: action()
        self.mock_build_config.return_value = MagicMock()

    def tearDown(self):
        self.patcher_sub.stop()
        self.patcher_bi.stop()
        self.patcher_metric.stop()
        self.patcher_query.stop()
        self.patcher_build_config.stop()
        self.patcher_trans.stop()

    async def test_run_by_id_success(self):
        runner = SubscriptionRunner(self.principal_service)
        
        # Mock Data
        sub_id = "sub_1"
        subscription = Subscription(
            id=sub_id,
            analysisId="analysis_1",
            tenantId="tenant_1",
            frequency=SubscriptionFrequency.DAY,
            time="10:00",
            enabled=True
        )
        self.mock_sub_service.find_by_id.return_value = subscription
        
        analysis = BIAnalysis(
            id="analysis_1",
            cards=[
                BIChartCard(id="card_1", metricId="metric_1", title="Test Card")
            ]
        )
        self.mock_bi_service.find_by_id.return_value = analysis
        
        metric = Metric(id="metric_1", name="test_metric")
        self.mock_metric_service.find_by_id.return_value = metric
        
        # Mock Query Result
        mock_result = MagicMock()
        mock_result.result_df.column_names = ["col1", "col2"]
        mock_result.result_df.rows = [[1, 2]]
        self.mock_query.return_value = mock_result
        
        # Execute
        await runner.run_by_id(sub_id)
        
        # Verify
        self.mock_sub_service.find_by_id.assert_called_with(sub_id)
        self.mock_bi_service.find_by_id.assert_called_with("analysis_1")
        self.mock_metric_service.find_by_id.assert_called_with("metric_1")
        self.mock_query.assert_called()

    def test_parse_time_range(self):
        runner = SubscriptionRunner(self.principal_service)
        
        # Test Past 7 days
        start, end = runner._parse_time_range('Past 7 days')
        self.assertIsNotNone(start)
        self.assertIsNotNone(end)
        diff = end - start
        self.assertAlmostEqual(diff.days, 7, delta=1)
        
        # Test Custom
        start, end = runner._parse_time_range('Custom:2023-01-01:2023-01-31')
        self.assertEqual(start.year, 2023)
        self.assertEqual(start.month, 1)
        self.assertEqual(start.day, 1)
        self.assertEqual(end.year, 2023)
        self.assertEqual(end.month, 1)
        self.assertEqual(end.day, 31)
        self.assertEqual(end.hour, 23)

    async def test_calculate_metric_with_dimensions_and_time(self):
        runner = SubscriptionRunner(self.principal_service)
        
        card = BIChartCard(
            id="card_1", 
            metricId="metric_1",
            selection=BIChartCardSelection(
                dimensions=["dim1"],
                timeRange="Past 30 days"
            )
        )
        
        metric = Metric(id="metric_1", name="test_metric")
        self.mock_metric_service.find_by_id.return_value = metric
        
        mock_result = MagicMock()
        mock_result.result_df.column_names = ["dim1", "value"]
        mock_result.result_df.rows = [["a", 10], ["b", 20]]
        self.mock_query.return_value = mock_result
        
        result = await runner._calculate_metric(card)
        
        self.assertIsNotNone(result)
        self.assertEqual(result["columns"], ["dim1", "value"])
        self.assertEqual(len(result["data"]), 2)
        
        # Verify query call args
        args, kwargs = self.mock_query.call_args
        self.assertEqual(kwargs['group_by'], ["dim1"])
        self.assertIsNotNone(kwargs['start_time'])
        self.assertIsNotNone(kwargs['end_time'])

if __name__ == '__main__':
    unittest.main()
