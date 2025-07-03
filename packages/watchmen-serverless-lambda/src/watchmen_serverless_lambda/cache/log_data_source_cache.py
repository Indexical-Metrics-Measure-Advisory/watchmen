from typing import Optional, Any, Callable

from watchmen_data_kernel.cache import InternalCache
from watchmen_model.common import DataSourceId
from watchmen_model.system import DataSource
from .cache_manger import get_log_data_source_by_tenant_id_cache, get_log_storage_builder_by_id_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class LogDataSourceCache:

    def __init__(self):
        self.ByTenantIdCache = InternalCache(cache=get_log_data_source_by_tenant_id_cache)
        self.builderByIdCache = InternalCache(cache=get_log_storage_builder_by_id_cache)
    

    def put_datasource_by_tenant_id(self, datasource: DataSource) -> Optional[DataSource]:
        self.ByTenantIdCache.remove(datasource.tenantId)
        existing_datasource = self.ByTenantIdCache.put(datasource.tenantId, datasource)
        return existing_datasource


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
    
    def put_builder_by_data_source_id(
            self, data_source_id: DataSourceId, builder: Callable[[], Any]
    ) -> Optional[Callable[[], Any]]:
        return self.builderByIdCache.put(data_source_id, builder)
    
    
    def get_builder_by_data_source_id(self, data_source_id: DataSourceId) -> Optional[Callable[[], Any]]:
        return self.builderByIdCache.get(data_source_id)


    def clear(self) -> None:
        self.ByTenantIdCache.clear()
        self.builderByIdCache.clear()


log_datasource_cache = LogDataSourceCache()