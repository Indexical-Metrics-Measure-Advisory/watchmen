from typing import List, Optional

from watchmen_model.common import TenantId

from watchmen_collector_kernel.model import CollectorModelConfig

from watchmen_data_kernel.cache import InternalCache

from .collector_cache_manger import get_model_config_by_tenant_and_name_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class ModelConfigCache:

	def __init__(self):
		self.ByTenantAndNameCache = InternalCache(cache=get_model_config_by_tenant_and_name_cache)

	# noinspection PyMethodMayBeStatic
	def to_tenant_and_name_key(self, name: str, tenant_id: TenantId) -> str:
		return f'{tenant_id}-{name}'

	def put(self, model_config: CollectorModelConfig) -> Optional[CollectorModelConfig]:
		if ask_collector_config_cache_enabled():
			self.ByTenantAndNameCache.remove(self.to_tenant_and_name_key(model_config.modelName, model_config.tenantId))
			# refresh other caches
			existing_config = self.ByTenantAndNameCache.put(self.to_tenant_and_name_key(model_config.modelName, model_config.tenantId),
			                                                model_config)
			return existing_config
		else:
			return None

	def get(self, model_name: str, tenant_id: TenantId) -> Optional[CollectorModelConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByTenantAndNameCache.get(self.to_tenant_and_name_key(model_name, tenant_id))
		else:
			return None

	def remove(self, model_name: str, tenant_id: TenantId) -> Optional[CollectorModelConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorModelConfig] = self.ByTenantAndNameCache.remove(self.to_tenant_and_name_key(model_name, tenant_id))
			return existing
		else:
			return None

	def all(self) -> List[CollectorModelConfig]:
		return list(self.ByTenantAndNameCache.values())

	def clear(self) -> None:
		self.ByTenantAndNameCache.clear()


model_config_cache = ModelConfigCache()
