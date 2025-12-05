import unittest
from unittest.mock import MagicMock, patch
import asyncio
import sys
import os

# Add src to sys.path
current_dir = os.getcwd()
src_path = os.path.join(current_dir, 'packages/watchmen-metricflow/src')
sys.path.append(src_path)

# Mock dependencies to avoid ImportError and setup complexity
sys.modules['watchmen_auth'] = MagicMock()
sys.modules['watchmen_meta'] = MagicMock()
sys.modules['watchmen_meta.common'] = MagicMock()
sys.modules['watchmen_metricflow.meta'] = MagicMock()
sys.modules['watchmen_metricflow.meta.metrics_meta_service'] = MagicMock()
sys.modules['watchmen_metricflow.meta.semantic_meta_service'] = MagicMock()
sys.modules['watchmen_metricflow.metricflow.config.db_version.cli_configuration_db'] = MagicMock()
sys.modules['watchmen_metricflow.metricflow.main_api'] = MagicMock()
sys.modules['watchmen_metricflow.model.dimension_response'] = MagicMock()
sys.modules['watchmen_metricflow.model.metric_request'] = MagicMock()
sys.modules['watchmen_metricflow.model.metrics'] = MagicMock()
sys.modules['watchmen_metricflow.model.semantic'] = MagicMock()
sys.modules['watchmen_rest'] = MagicMock()
sys.modules['watchmen_utilities'] = MagicMock()
sys.modules['metricflow'] = MagicMock()
sys.modules['metricflow.data_table'] = MagicMock()
sys.modules['metricflow.data_table.column_types'] = MagicMock()
sys.modules['metricflow.engine'] = MagicMock()
sys.modules['metricflow.engine.metricflow_engine'] = MagicMock()

# Mock metric_config_cache
cache_mock = MagicMock()
cache_mock.get.return_value = None
sys.modules['watchmen_metricflow.cache.metric_config_cache'] = MagicMock()
sys.modules['watchmen_metricflow.cache.metric_config_cache'].metric_config_cache = cache_mock

# Now import the module under test
# We use a try-except block to catch import errors and print them for debugging
try:
    from watchmen_metricflow.router import metric_router
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)

class TestMetricRouterLogic(unittest.TestCase):
    
    @patch('watchmen_metricflow.router.metric_router.load_metrics_by_tenant_id')
    @patch('watchmen_metricflow.router.metric_router.load_semantic_models_by_tenant_id')
    @patch('watchmen_metricflow.router.metric_router.build_profile')
    @patch('watchmen_metricflow.router.metric_router.CLIConfigurationDB')
    def test_build_metric_config_error(self, mock_cli_db, mock_build_profile, mock_load_semantics, mock_load_metrics):
        # Setup
        mock_load_metrics.return_value = []
        
        # 3 semantics
        mock_load_semantics.return_value = ["s1", "s2", "s3"]
        
        # 3 distinct profiles
        def side_effect(semantic, principal):
            idx = semantic[-1]
            return {
                "outputs": {
                    "postgres": {
                        "host": f"host{idx}",
                        "port": 5432,
                        "dbname": "db",
                        "schema": "public",
                        "user": "user"
                    }
                }
            }
        mock_build_profile.side_effect = side_effect
        
        principal_service = MagicMock()
        principal_service.tenantId = "t1"
        
        # Execute & Assert
        try:
            asyncio.run(metric_router.build_metric_config(principal_service))
            self.fail("Should have raised HTTPException")
        except Exception as e:
            # Check detail
            self.assertIn("Too many data sources", str(e.detail) if hasattr(e, 'detail') else str(e))

    @patch('watchmen_metricflow.router.metric_router.load_metrics_by_tenant_id')
    @patch('watchmen_metricflow.router.metric_router.load_semantic_models_by_tenant_id')
    @patch('watchmen_metricflow.router.metric_router.build_profile')
    @patch('watchmen_metricflow.router.metric_router.CLIConfigurationDB')
    def test_build_metric_config_merge_duplicate(self, mock_cli_db, mock_build_profile, mock_load_semantics, mock_load_metrics):
        # Setup
        mock_load_metrics.return_value = []
        
        # 2 semantics, same data source
        mock_load_semantics.return_value = ["s1", "s2"]
        
        # Same profile
        profile_data = {
                "outputs": {
                    "postgres": {
                        "host": "host1",
                        "port": 5432,
                        "dbname": "db",
                        "schema": "public",
                        "user": "user"
                    }
                }
            }
        mock_build_profile.return_value = profile_data
        
        principal_service = MagicMock()
        principal_service.tenantId = "t1"
        
        # Execute
        asyncio.run(metric_router.build_metric_config(principal_service))
        
        # Assert
        # Check what CLIConfigurationDB was called with
        args, _ = mock_cli_db.call_args
        profile_arg = args[3] # 4th argument
        
        # Should have 1 output in 'outputs' because they are identical
        self.assertEqual(len(profile_arg["profile"]["outputs"]), 1)
        self.assertIn("postgres", profile_arg["profile"]["outputs"])

    @patch('watchmen_metricflow.router.metric_router.load_metrics_by_tenant_id')
    @patch('watchmen_metricflow.router.metric_router.load_semantic_models_by_tenant_id')
    @patch('watchmen_metricflow.router.metric_router.build_profile')
    @patch('watchmen_metricflow.router.metric_router.CLIConfigurationDB')
    def test_build_metric_config_merge_distinct(self, mock_cli_db, mock_build_profile, mock_load_semantics, mock_load_metrics):
        # Setup
        mock_load_metrics.return_value = []
        
        # 2 semantics, distinct data source
        mock_load_semantics.return_value = ["s1", "s2"]
        
        def side_effect(semantic, principal):
            idx = semantic[-1]
            return {
                "outputs": {
                    "postgres": {
                        "host": f"host{idx}",
                        "port": 5432,
                        "dbname": "db",
                        "schema": "public",
                        "user": "user"
                    }
                }
            }
        mock_build_profile.side_effect = side_effect
        
        principal_service = MagicMock()
        principal_service.tenantId = "t1"
        
        # Execute
        asyncio.run(metric_router.build_metric_config(principal_service))
        
        # Assert
        args, _ = mock_cli_db.call_args
        profile_arg = args[3]
        
        # Should have 2 outputs
        self.assertEqual(len(profile_arg["profile"]["outputs"]), 2)
        # Keys should be "postgres" and "postgres_1"
        keys = list(profile_arg["profile"]["outputs"].keys())
        self.assertIn("postgres", keys)
        self.assertTrue(any(k.startswith("postgres_") for k in keys))

if __name__ == '__main__':
    unittest.main()
