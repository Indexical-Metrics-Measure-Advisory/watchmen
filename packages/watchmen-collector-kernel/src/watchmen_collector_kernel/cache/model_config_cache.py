from typing import List, Optional

from watchmen_collector_kernel.model import CollectorModelConfig

from watchmen_data_kernel.cache import InternalCache

from .collector_cache_manger import get_model_config_by_name_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class ModelConfigCache:

	def __init__(self):
		self.ByNameCache = InternalCache(cache=get_model_config_by_name_cache)

	def put(self, model_config: CollectorModelConfig) -> Optional[CollectorModelConfig]:
		if ask_collector_config_cache_enabled():
			self.ByNameCache.remove(model_config.modelName)
			# refresh other caches
			existing_config = self.ByNameCache.put(model_config.modelName, model_config)
			return existing_config
		else:
			return None

	def get(self, model_name: str) -> Optional[CollectorModelConfig]:
		if ask_collector_config_cache_enabled():
			return self.ByNameCache.get(model_name)
		else:
			return None

	def remove(self, model_name: str) -> Optional[CollectorModelConfig]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorModelConfig] = self.ByNameCache.remove(model_name)
			return existing
		else:
			return None

	def all(self) -> List[CollectorModelConfig]:
		return list(self.ByNameCache.values())

	def clear(self) -> None:
		self.ByNameCache.clear()


model_config_cache = ModelConfigCache()
