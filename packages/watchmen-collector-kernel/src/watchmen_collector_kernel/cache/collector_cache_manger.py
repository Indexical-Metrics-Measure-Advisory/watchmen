from cacheout import Cache
from watchmen_data_kernel.cache.cache_manager import cache_set

from watchmen_data_kernel.cache import configure_cache


class ModelConfigByIdCache(Cache):
	pass


class ModelConfigByTenantAndNameCache(Cache):
	pass


class TableConfigByIdCache(Cache):
	pass


class TableConfigByTenantAndNameCache(Cache):
	pass


class TableConfigsByTenantAndParentNameCache(Cache):
	pass


class TableConfigByTenantAndTableNameCache(Cache):
	pass


class CollectorTopicByIdCache(Cache):
	pass


configure_cache('MODEL_CONFIG_BY_ID',
                {'cache_class': ModelConfigByIdCache, 'maxsize': 512})


configure_cache('MODEL_CONFIG_BY_TENANT_AND_NAME',
                {'cache_class': ModelConfigByTenantAndNameCache, 'maxsize': 512})


configure_cache('TABLE_CONFIG_BY_ID',
                {'cache_class': TableConfigByIdCache, 'maxsize': 512})


configure_cache('TABLE_CONFIG_BY_TENANT_AND_NAME',
                {'cache_class': TableConfigByTenantAndNameCache, 'maxsize': 512})


configure_cache('TABLE_CONFIGS_BY_TENANT_AND_PARENT_NAME',
                {'cache_class': TableConfigsByTenantAndParentNameCache, 'maxsize': 512})


configure_cache('TABLE_CONFIG_BY_TENANT_AND_TABLE_NAME',
                {'cache_class': TableConfigByTenantAndTableNameCache, 'maxsize': 512})


configure_cache('COLLECTOR_TOPIC_BY_ID',
                {'cache_class': CollectorTopicByIdCache, 'maxsize': 512})


def get_model_config_by_tenant_and_name_cache() -> ModelConfigByTenantAndNameCache:
	return cache_set['MODEL_CONFIG_BY_TENANT_AND_NAME']


def get_table_config_by_tenant_and_name_cache() -> TableConfigByTenantAndNameCache:
	return cache_set['TABLE_CONFIG_BY_TENANT_AND_NAME']


def get_table_configs_by_tenant_and_parent_name_cache() -> TableConfigsByTenantAndParentNameCache:
	return cache_set['TABLE_CONFIGS_BY_TENANT_AND_PARENT_NAME']


def get_table_config_by_tenant_and_table_name_cache() -> TableConfigByTenantAndTableNameCache:
	return cache_set['TABLE_CONFIG_BY_TENANT_AND_TABLE_NAME']


def get_collector_topic_by_id_cache() -> CollectorTopicByIdCache:
	return cache_set['COLLECTOR_TOPIC_BY_ID']

