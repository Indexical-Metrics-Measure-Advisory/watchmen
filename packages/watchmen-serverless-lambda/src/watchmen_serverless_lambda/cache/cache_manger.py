from cacheout import Cache
from watchmen_data_kernel.cache.cache_manager import cache_set

from watchmen_data_kernel.cache import configure_cache


class LogDataSourceByTenantIdCache(Cache):
	pass


class LogStorageBuilderByIdCache(Cache):
	pass


configure_cache('LogDataSourceByTenantIdCache',
                {'cache_class': LogDataSourceByTenantIdCache, 'maxsize': 512})


configure_cache('LogStorageBuilderByIdCache',
                {'cache_class': LogStorageBuilderByIdCache, 'maxsize': 512})


def get_log_data_source_by_tenant_id_cache() -> LogDataSourceByTenantIdCache:
	return cache_set['LogDataSourceByTenantIdCache']


def get_log_storage_builder_by_id_cache() -> LogStorageBuilderByIdCache:
	return cache_set['LogStorageBuilderByIdCache']

