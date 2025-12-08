import unittest
from unittest.mock import MagicMock, patch
from watchmen_metricflow.cache.metric_config_cache import MetricConfigCache

class TestMetricConfigCache(unittest.TestCase):
    def test_remove(self):
        # Setup
        cache = MetricConfigCache()
        cache.byTenantCache = MagicMock()
        
        tenant_id = "123"
        
        # Execute
        cache.remove(tenant_id)
        
        # Verify
        cache.byTenantCache.remove.assert_called_once_with(tenant_id)

if __name__ == '__main__':
    unittest.main()
