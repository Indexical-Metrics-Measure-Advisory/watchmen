from typing import List, Optional, Tuple

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

    def remove(self, tenant_id: str):
        self.byTenantCache.remove(tenant_id)

    def clear(self):
        self.byTenantCache.clear()


class MetricMetaByTenantCache(Cache):
    pass


configure_cache('METRIC_META_BY_TENANT', {
    'cache_class': MetricMetaByTenantCache,
    'maxsize': 256
})


def get_metric_meta_by_tenant_cache() -> MetricMetaByTenantCache:
    # noinspection PyTypeChecker
    return find_cache('METRIC_META_BY_TENANT')


# safety-net TTL for the meta cache; explicit invalidation happens on metric /
# semantic model writes (see metric_meta_cache.remove call sites)
METRIC_META_CACHE_TTL_SECONDS = 300


class MetricMetaCache:
    """Caches (metrics, semantic_models) per tenant for the direct (non-dbt) query path.

    The direct path used to scan both meta tables on every query; the dbt path
    already had MetricConfigCache. Entries are removed on metric / semantic
    model writes and expire after METRIC_META_CACHE_TTL_SECONDS as a safety net
    for changes that bypass those write paths (e.g. topic or data source edits).
    """

    def __init__(self):
        # noinspection PyTypeChecker
        self.byTenantCache = InternalCache(cache=get_metric_meta_by_tenant_cache)

    def get(self, tenant_id: str) -> Optional[Tuple[List, List]]:
        return self.byTenantCache.get(tenant_id)

    def put(self, tenant_id: str, metrics: List, semantic_models: List) -> None:
        self.byTenantCache.put(tenant_id, (metrics, semantic_models), ttl=METRIC_META_CACHE_TTL_SECONDS)

    def remove(self, tenant_id: str):
        self.byTenantCache.remove(tenant_id)

    def clear(self):
        self.byTenantCache.clear()


metric_config_cache = MetricConfigCache()
metric_meta_cache = MetricMetaCache()