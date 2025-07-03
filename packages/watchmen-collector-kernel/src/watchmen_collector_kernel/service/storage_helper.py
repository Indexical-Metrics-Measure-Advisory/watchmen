from typing import Optional, List, Callable

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.storage.topic_storage import build_topic_data_storage
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import DataSourceService as DataSourceStorageService
from watchmen_model.common import TenantId
from watchmen_model.system import DataSource
from watchmen_storage import TransactionalStorageSPI
from watchmen_utilities import ArrayHelper


class CollectorDataSourceService:
    
    def __init__(self, principal_service: PrincipalService):
        self.principalService = principal_service
    
    def find_datasource_by_tenant_id(self, tenant_id: TenantId, filter_: Callable[[DataSource], bool]) -> Optional[DataSource]:
        data_source = CollectorCacheService.collector_datasource().get_datasource_by_tenant_id(tenant_id)
        if data_source is not None:
            return data_source
        
        storage_service = DataSourceStorageService(
            ask_meta_storage(), ask_snowflake_generator(), self.principalService)
        storage_service.begin_transaction()
        try:
            # noinspection PyTypeChecker
            data_sources: List[DataSource] = storage_service.find_all(tenant_id)
            data_source: DataSource = ArrayHelper(data_sources).find(filter_)
            
            if data_source is None:
                return None
            
            CollectorCacheService.collector_datasource().put_datasource_by_tenant_id(data_source)
            return data_source
        finally:
            storage_service.close_transaction()


def get_collector_data_source_service(principal_service: PrincipalService) -> CollectorDataSourceService:
    return CollectorDataSourceService(principal_service)


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
    return DataSourceService(principal_service)


def ask_collector_storage(tenant_id: str, principal_service: PrincipalService) -> TransactionalStorageSPI:
    
    def filter_datasource(datasource: DataSource) -> bool:
        if datasource.params:
            for param in datasource.params:
                if param.name == "collector" and param.value:
                    return True
        return False
    
    collector_datasource_service = get_collector_data_source_service(principal_service)
    data_source: DataSource = collector_datasource_service.find_datasource_by_tenant_id(tenant_id, filter_datasource)
    if data_source:
        build = CacheService.data_source().get_builder(data_source.data_source_id)
        if build is not None:
            return build()
           
        build = build_topic_data_storage(data_source)
        CacheService.data_source().put_builder(data_source.data_source_id, build)
        return build()
    else:
        return ask_meta_storage()
