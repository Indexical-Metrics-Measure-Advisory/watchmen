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
    data_source: DataSource = ask_datasource_by_param_name(tenant_id, principal_service, "collector")
    if data_source:
        return ask_storage_by_data_source(data_source)
    else:
        return ask_meta_storage()


def ask_datasource_by_param_name(tenant_id: str, principal_service: PrincipalService, param_name: str) -> Optional[DataSource]:
    
    def filter_datasource(datasource: DataSource) -> bool:
        if datasource.params:
            for param in datasource.params:
                if param.name == param_name and param.value == "true":
                    return True
        return False
    
    collector_datasource_service = get_collector_data_source_service(principal_service)
    data_source: DataSource = collector_datasource_service.find_datasource_by_tenant_id(tenant_id,
                                                                                        filter_datasource)
    return data_source


def ask_storage_by_data_source( data_source: DataSource) -> TransactionalStorageSPI:
    build = CacheService.data_source().get_builder(data_source.dataSourceId)
    if build is not None:
        return build()

    build = build_topic_data_storage(data_source)
    CacheService.data_source().put_builder(data_source.dataSourceId, build)
    return build()


def is_retryable_storage_error(error: BaseException) -> bool:
	"""
	Deadlock / lock-wait victims must NOT be archived as FAIL - that silently
	loses the row. Leave it EXECUTING so CleanOfTimeout resets it for a retry.
	Covers MySQL (1213/1205) and PostgreSQL SQLSTATE (40001/40P01/55P03).
	"""
	# noinspection PyBroadException
	try:
		retryable_sqlstates = {'40001', '40P01', '55P03'}
		orig = getattr(error, 'orig', error)
		args = getattr(orig, 'args', None)
		if args:
			first = args[0]
			if isinstance(first, int):
				return first in (1213, 1205)
			if isinstance(first, str) and first.strip().upper() in retryable_sqlstates | {'1213', '1205'}:
				return True
		pgcode = getattr(orig, 'pgcode', None) or getattr(error, 'pgcode', None)
		if isinstance(pgcode, str) and pgcode.strip().upper() in retryable_sqlstates:
			return True
		sqlstate = getattr(orig, 'sqlstate', None) or getattr(error, 'sqlstate', None)
		if isinstance(sqlstate, str) and sqlstate.strip().upper() in retryable_sqlstates:
			return True
		text = str(orig)
		return '1213' in text or '1205' in text
	except Exception:
		return False