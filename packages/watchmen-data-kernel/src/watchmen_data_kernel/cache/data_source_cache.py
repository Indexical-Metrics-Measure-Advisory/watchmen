from typing import Callable, List, Optional

from watchmen_model.common import DataSourceId
from watchmen_model.system import DataSource
from watchmen_storage import TopicDataStorageSPI
from .cache_manager import get_data_source_by_id_cache, get_data_storage_builder_by_id_cache
from .internal_cache import InternalCache


class DataSourceCache:
	"""
	data source cache will not impact other caches
	"""

	def __init__(self):
		self.byIdCache = InternalCache(cache=get_data_source_by_id_cache)
		self.builderByIdCache = InternalCache(cache=get_data_storage_builder_by_id_cache)

	def put(self, data_source: DataSource) -> Optional[DataSource]:
		return self.byIdCache.put(data_source.dataSourceId, data_source)

	def put_builder(
			self, data_source_id: DataSourceId, builder: Callable[[], TopicDataStorageSPI]
	) -> Optional[Callable[[], TopicDataStorageSPI]]:
		return self.builderByIdCache.put(data_source_id, builder)

	def get(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		return self.byIdCache.get(data_source_id)

	def get_builder(self, data_source_id: DataSourceId) -> Optional[Callable[[], TopicDataStorageSPI]]:
		return self.builderByIdCache.get(data_source_id)

	def remove(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		data_source = self.byIdCache.remove(data_source_id)
		self.builderByIdCache.remove(data_source_id)
		return data_source

	def all(self) -> List[DataSource]:
		return list(self.byIdCache.values())

	def clear(self) -> None:
		self.byIdCache.clear()


data_source_cache = DataSourceCache()
