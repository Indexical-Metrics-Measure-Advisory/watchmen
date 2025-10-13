from typing import Optional

from cacheout import Cache

from watchmen_data_kernel.cache import configure_cache, find_cache, InternalCache
from watchmen_metricflow.metricflow.config.db_version.cli_configuration_db import CLIConfigurationDB


class MetricConfigByTenantCache(Cache):
    pass


configure_cache('METRIC_CONFIG_BY_TENANT', {
    'cache_class': MetricConfigByTenantCache,
    'maxsize': 256
})


def get_metric_config_by_tenant_cache() -> MetricConfigByTenantCache:
    # noinspection PyTypeChecker
    return find_cache('METRIC_CONFIG_BY_TENANT')


class MetricConfigCache:
    def __init__(self):
        # noinspection PyTypeChecker
        self.byTenantCache = InternalCache(cache=get_metric_config_by_tenant_cache)

    def get(self, tenant_id: str) -> Optional[CLIConfigurationDB]:
        return self.byTenantCache.get(tenant_id)

    def put(self, tenant_id: str, cfg: CLIConfigurationDB) -> Optional[CLIConfigurationDB]:
        return self.byTenantCache.put(tenant_id, cfg)

    def clear(self):
        self.byTenantCache.clear()


metric_config_cache = MetricConfigCache()