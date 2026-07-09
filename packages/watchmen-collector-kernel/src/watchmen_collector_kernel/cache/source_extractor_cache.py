from typing import Optional

from watchmen_data_kernel.cache import InternalCache
from .collector_cache_manger import get_source_extractor_by_config_id_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class SourceExtractorCache:
	"""
	Caches SourceExtractor instances by configId. An extractor is a stateless
	querier built from a CollectorTableConfig (it holds references to topic,
	storage and service). Rebuilding one on every record is expensive because it
	re-registers the topic and re-creates the storage connection, even though the
	underlying topic/storage are themselves cached by dataSourceId. Caching the
	extractor here lets all callers (data_capture, record_to_json, etc.) reuse a
	single instance per config.
	"""

	def __init__(self):
		self.byConfigIdCache = InternalCache(cache=get_source_extractor_by_config_id_cache)

	def put_extractor_by_config_id(self, config_id: str, extractor) -> Optional[object]:
		if ask_collector_config_cache_enabled():
			self.byConfigIdCache.remove(config_id)
			existing = self.byConfigIdCache.put(config_id, extractor)
			return existing
		else:
			return None

	def get_extractor_by_config_id(self, config_id: str):
		if ask_collector_config_cache_enabled():
			return self.byConfigIdCache.get(config_id)
		else:
			return None

	def remove_extractor_by_config_id(self, config_id: str):
		if ask_collector_config_cache_enabled():
			return self.byConfigIdCache.remove(config_id)
		else:
			return None

	def clear(self) -> None:
		self.byConfigIdCache.clear()


source_extractor_cache = SourceExtractorCache()
