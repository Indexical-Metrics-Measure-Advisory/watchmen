from typing import Optional, List

from watchmen_model.common import TenantId

from watchmen_collector_kernel.model import CollectorTableConfig

from watchmen_data_kernel.cache import InternalCache

from .collector_cache_manger import get_table_config_by_tenant_and_name_cache, \
	get_table_config_by_tenant_and_table_name_cache, get_table_configs_by_tenant_and_parent_name_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class TableConfigCache:

	def __init__(self):
		self.ByTenantAndNameCache = InternalCache(cache=get_table_config_by_tenant_and_name_cache)
		self.ByTenantAndParentNameCache = InternalCache(cache=get_table_configs_by_tenant_and_parent_name_cache)
		self.ByTenantAndTableNameCache = InternalCache(cache=get_table_config_by_tenant_and_table_name_cache)

	# noinspection PyMethodMayBeStatic
	def to_tenant_and_name_key(self, name: str, tenant_id: TenantId) -> str:
		return f'{tenant_id}-{name}'

	def put_config_by_name(self, table_config: CollectorTableConfig) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			self.ByTenantAndNameCache.remove(self.to_tenant_and_name_key(table_config.name, table_config.tenantId))
			existing_config = self.ByTenantAndNameCache.put(
				self.to_tenant_and_name_key(table_config.name, table_config.tenantId), table_config)
			return existing_config
		else:
			return None

	def get_config_by_name(self, name: str, tenant_id: TenantId) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByTenantAndNameCache.get(self.to_tenant_and_name_key(name, tenant_id))
		else:
			return None

	def remove_config_by_name(self, name: str, tenant_id: TenantId) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorTableConfig] = self.ByTenantAndNameCache.remove(self.to_tenant_and_name_key(name, tenant_id))
			return existing
		else:
			return None

	def put_config_by_table_name(self, table_config: CollectorTableConfig) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			self.ByTenantAndTableNameCache.remove(table_config.tableName)
			existing_config = self.ByTenantAndTableNameCache.put(self.to_tenant_and_name_key(table_config.tableName, table_config.tenantId),
			                                                     table_config)
			return existing_config
		else:
			return None

	def get_config_by_table_name(self, table_name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByTenantAndTableNameCache.get(self.to_tenant_and_name_key(table_name, tenant_id))
		else:
			return None

	def remove_config_by_table_name(self, table_name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorTableConfig] = self.ByTenantAndTableNameCache.remove(
				self.to_tenant_and_name_key(table_name, tenant_id)
			)
			return existing
		else:
			return None

	def put_configs_by_parent_name(self, parent_name: str, tenant_id: str,
	                               configs: List[CollectorTableConfig]) -> Optional[List[CollectorTableConfig]]:
		if ask_collector_config_cache_enabled():
			self.ByTenantAndParentNameCache.remove(
				self.to_tenant_and_name_key(parent_name, tenant_id)
			)
			existing_configs = self.ByTenantAndParentNameCache.put(
				self.to_tenant_and_name_key(parent_name, tenant_id),
				configs
			)
			return existing_configs
		else:
			return None

	def get_configs_by_parent_name(self, parent_name: str, tenant_id: str) -> Optional[List[CollectorTableConfig]]:
		if ask_collector_config_cache_enabled():
			return self.ByTenantAndParentNameCache.get(
				self.to_tenant_and_name_key(parent_name, tenant_id)
			)
		else:
			return None

	def remove_configs_by_parent_name(self, parent_name: str, tenant_id: str) -> Optional[List[CollectorTableConfig]]:
		if ask_collector_config_cache_enabled():
			existing_configs: Optional[List[CollectorTableConfig]] = self.ByTenantAndParentNameCache.remove(
				self.to_tenant_and_name_key(parent_name, tenant_id)
			)
			return existing_configs
		else:
			return None

	def clear(self) -> None:
		self.ByTenantAndNameCache.clear()
		self.ByTenantAndTableNameCache.clear()
		self.ByTenantAndParentNameCache.clear()


table_config_cache = TableConfigCache()
