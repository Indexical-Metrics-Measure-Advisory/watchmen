from typing import List, Optional

from watchmen_model.common import TenantId

from watchmen_collector_kernel.model import CollectorModuleConfig

from watchmen_data_kernel.cache import InternalCache

from .collector_cache_manger import get_module_config_by_id_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class ModuleConfigCache:

	def __init__(self):
		self.ByIdCache = InternalCache(cache=get_module_config_by_id_cache)

	def put(self, module_config: CollectorModuleConfig) -> Optional[CollectorModuleConfig]:
		if ask_collector_config_cache_enabled():
			self.ByIdCache.remove(module_config.moduleId)
			# refresh other caches
			existing_config = self.ByIdCache.put(module_config.moduleId,module_config)
			return existing_config
		else:
			return None

	def get(self, module_id: str) -> Optional[CollectorModuleConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByIdCache.get(module_id)
		else:
			return None

	def remove(self, module_id: str) -> Optional[CollectorModuleConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorModuleConfig] = self.ByIdCache.remove(module_id)
			return existing
		else:
			return None

	def all(self) -> List[CollectorModuleConfig]:
		return list(self.ByIdCache.values())

	def clear(self) -> None:
		self.ByIdCache.clear()


module_config_cache = ModuleConfigCache()
