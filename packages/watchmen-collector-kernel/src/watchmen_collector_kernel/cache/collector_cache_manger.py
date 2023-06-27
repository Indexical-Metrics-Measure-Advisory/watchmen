from cacheout import Cache
from watchmen_data_kernel.cache.cache_manager import cache_set

from watchmen_data_kernel.cache import configure_cache


class ModelConfigByNameCache(Cache):
	pass


class TableConfigByNameCache(Cache):
	pass


class TableConfigByTableNameCache(Cache):
	pass


class TableConfigsByParentNameCache(Cache):
	pass


configure_cache('MODEL_CONFIG_BY_NAME',
                {'cache_class': ModelConfigByNameCache, 'maxsize': 512})


configure_cache('TABLE_CONFIG_BY_NAME',
                {'cache_class': TableConfigByNameCache, 'maxsize': 512})


configure_cache('TABLE_CONFIG_BY_TABLE_NAME',
                {'cache_class': TableConfigByTableNameCache, 'maxsize': 512})


configure_cache('TABLE_CONFIGS_BY_PARENT_NAME',
                {'cache_class': TableConfigsByParentNameCache, 'maxsize': 512})


def get_model_config_by_name_cache() -> ModelConfigByNameCache:
	return cache_set['MODEL_CONFIG_BY_NAME']


def get_table_config_by_name_cache() -> TableConfigByNameCache:
	return cache_set['TABLE_CONFIG_BY_NAME']


def get_table_config_by_table_name_cache() -> TableConfigByTableNameCache:
	return cache_set['TABLE_CONFIG_BY_TABLE_NAME']


def get_table_configs_by_parent_name_cache() -> TableConfigsByParentNameCache:
	return cache_set['TABLE_CONFIGS_BY_PARENT_NAME']



