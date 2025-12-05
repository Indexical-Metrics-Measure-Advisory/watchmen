import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from typing import List, Dict, Optional, Tuple

# Add src to sys.path
current_dir = os.getcwd()
src_path = os.path.join(current_dir, "packages/watchmen-metricflow/src")
sys.path.append(src_path)

# Mock modules that might be missing or causing issues
sys.modules["watchmen_auth"] = MagicMock()
sys.modules["watchmen_meta.common"] = MagicMock()
sys.modules["watchmen_meta.system"] = MagicMock()
sys.modules["watchmen_metricflow.meta.metrics_meta_service"] = MagicMock()
sys.modules["watchmen_metricflow.meta.semantic_meta_service"] = MagicMock()
sys.modules["watchmen_metricflow.model.metrics"] = MagicMock()
sys.modules["watchmen_metricflow.model.semantic"] = MagicMock()
sys.modules["watchmen_model.common"] = MagicMock()
sys.modules["watchmen_model.system"] = MagicMock()
sys.modules["watchmen_rest"] = MagicMock()
sys.modules["watchmen_utilities"] = MagicMock()
sys.modules["watchmen_metricflow.cache.metric_config_cache"] = MagicMock()
sys.modules["metricflow.data_table.column_types"] = MagicMock()
sys.modules["metricflow.engine.metricflow_engine"] = MagicMock()
sys.modules["watchmen_metricflow.metricflow.config.db_version.cli_configuration_db"] = MagicMock()
sys.modules["watchmen_metricflow.metricflow.main_api"] = MagicMock()
sys.modules["watchmen_metricflow.model.dimension_response"] = MagicMock()
sys.modules["watchmen_metricflow.model.metric_request"] = MagicMock()

# Now import the module to test
# We need to ensure FastAPI is available or mocked if not installed in the env, 
# but it should be there based on imports.
try:
    from watchmen_metricflow.router.metric_router import get_data_source_key, build_merged_profile
    from fastapi import HTTPException
except ImportError:
    # If fastapi is not installed in this environment, we mock it for the test logic if possible
    # But metric_router imports it at top level, so it must be there.
    pass

class TestMetricRouterRefactor(unittest.TestCase):
    
    def test_get_data_source_key(self):
        # Case 1: Valid profile data
        profile_data = {
            "outputs": {
                "postgres": {
                    "host": "localhost",
                    "port": 5432,
                    "dbname": "testdb",
                    "schema": "public",
                    "user": "admin"
                }
            }
        }
        expected_key = ("localhost", 5432, "testdb", "public", "admin")
        self.assertEqual(get_data_source_key(profile_data), expected_key)
        
        # Case 2: Missing postgres output
        profile_data_missing = {"outputs": {"other": {}}}
        self.assertIsNone(get_data_source_key(profile_data_missing))
        
        # Case 3: None input
        self.assertIsNone(get_data_source_key(None))

    @patch("watchmen_metricflow.router.metric_router.build_profile")
    def test_build_merged_profile(self, mock_build_profile):
        principal_service = MagicMock()
        semantics = [MagicMock(), MagicMock()]
        
        # Mock build_profile to return different profiles
        profile1 = {
            "outputs": {
                "postgres": {
                    "host": "host1", "port": 5432, "dbname": "db1", "schema": "public", "user": "user1"
                }
            }
        }
        profile2 = {
            "outputs": {
                "postgres": {
                    "host": "host2", "port": 5432, "dbname": "db2", "schema": "public", "user": "user2"
                }
            }
        }
        
        # Case 1: Two different data sources (valid)
        mock_build_profile.side_effect = [profile1, profile2]
        result = build_merged_profile(semantics, principal_service)
        self.assertIsNotNone(result)
        self.assertIn("postgres", result["profile"]["outputs"])
        self.assertIn("postgres_1", result["profile"]["outputs"])
        
        # Case 2: Same data source (should merge/deduplicate)
        mock_build_profile.side_effect = [profile1, profile1]
        result = build_merged_profile(semantics, principal_service)
        self.assertIsNotNone(result)
        self.assertEqual(len(result["profile"]["outputs"]), 1)
        self.assertIn("postgres", result["profile"]["outputs"])
        
        # Case 3: Too many data sources
        semantics_3 = [MagicMock(), MagicMock(), MagicMock()]
        profile3 = {
            "outputs": {
                "postgres": {
                    "host": "host3", "port": 5432, "dbname": "db3", "schema": "public", "user": "user3"
                }
            }
        }
        mock_build_profile.side_effect = [profile1, profile2, profile3]
        with self.assertRaises(HTTPException) as cm:
            build_merged_profile(semantics_3, principal_service)
        self.assertEqual(cm.exception.status_code, 400)

if __name__ == "__main__":
    unittest.main()
