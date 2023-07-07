from typing import List, Optional, Dict

from watchmen_model.common import TenantId

from watchmen_collector_kernel.model import CollectorTableConfig

from watchmen_data_kernel.cache import InternalCache

from .collector_cache_manger import get_table_config_by_name_cache, \
	get_table_config_by_table_name_cache, get_table_configs_by_parent_name_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class TableConfigCache:

	def __init__(self):
		self.ByNameCache = InternalCache(cache=get_table_config_by_name_cache)
		self.ByTableNameCache = InternalCache(cache=get_table_config_by_table_name_cache)
		self.ByParentNameCache = InternalCache(cache=get_table_configs_by_parent_name_cache)

	# noinspection PyMethodMayBeStatic
	def to_tenant_and_name_key(self, name: str, tenant_id: TenantId) -> str:
		return f'{tenant_id}-{name}'

	def put_config_by_name(self, table_config: CollectorTableConfig) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			self.ByNameCache.remove(table_config.name)
			existing_config = self.ByTableNameCache.put(table_config.name, table_config)
			return existing_config
		else:
			return None

	def get_config_by_name(self, name: str) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByNameCache.get(name)
		else:
			return None

	def remove_config_by_name(self, name: str) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorTableConfig] = self.ByNameCache.remove(name)
			return existing
		else:
			return None

	def put_config_by_table_name(self, table_config: CollectorTableConfig) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			self.ByTableNameCache.remove(table_config.tableName)
			existing_config = self.ByTableNameCache.put(table_config.tableName, table_config)
			return existing_config
		else:
			return None

	def get_config_by_table_name(self, table_name: str) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByTableNameCache.get(table_name)
		else:
			return None

	def remove_config_by_table_name(self, table_name: str) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorTableConfig] = self.ByTableNameCache.remove(table_name)
			return existing
		else:
			return None

	def put_configs_by_parent_name(self, parent_name: str,
	                               configs: List[CollectorTableConfig]) -> Optional[List[CollectorTableConfig]]:
		if ask_collector_config_cache_enabled():
			self.ByParentNameCache.remove(parent_name)
			existing_configs = self.ByParentNameCache.put(parent_name, configs)
			return existing_configs
		else:
			return None

	def get_configs_by_parent_name(self, parent_name: str) -> Optional[List[CollectorTableConfig]]:
		if ask_collector_config_cache_enabled():
			return self.ByParentNameCache.get(parent_name)
		else:
			return None

	def remove_configs_by_parent_name(self, parent_name: str) -> Optional[List[CollectorTableConfig]]:
		if ask_collector_config_cache_enabled():
			existing_configs: Optional[List[CollectorTableConfig]] = self.ByParentNameCache.remove(parent_name)
			return existing_configs
		else:
			return None

	def clear(self) -> None:
		self.ByNameCache.clear()
		self.ByTableNameCache.clear()
		self.ByParentNameCache.clear()


table_config_cache = TableConfigCache()
