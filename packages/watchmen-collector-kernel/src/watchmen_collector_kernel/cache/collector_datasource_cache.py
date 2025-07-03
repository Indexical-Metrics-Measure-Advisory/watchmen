from typing import Optional

from watchmen_data_kernel.cache import InternalCache
from watchmen_model.system import DataSource
from .collector_cache_manger import get_collector_datasource_by_tenant_id_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class CollectorDatasourceCache:

    def __init__(self):
        self.ByTenantIdCache = InternalCache(cache=get_collector_datasource_by_tenant_id_cache)
    

    def put_datasource_by_tenant_id(self, datasource: DataSource) -> Optional[DataSource]:
        if ask_collector_config_cache_enabled():
            self.ByTenantIdCache.remove(datasource.tenantId)
            existing_datasource = self.ByTenantIdCache.put(datasource.tenantId, datasource)
            return existing_datasource
        else:
            return None


    def get_datasource_by_tenant_id(self, id_: str) -> Optional[DataSource]:
        if ask_collector_config_cache_enabled():
            return self.ByTenantIdCache.get(id_)
        else:
            return None


    def remove_datasource_by_tenant_id(self, id_: str) -> Optional[DataSource]:
        if ask_collector_config_cache_enabled():
            existing: Optional[DataSource] = self.ByTenantIdCache.remove(id_)
            return existing
        else:
            return None


    def clear(self) -> None:
        self.ByTenantIdCache.clear()


collector_datasource_cache = CollectorDatasourceCache()