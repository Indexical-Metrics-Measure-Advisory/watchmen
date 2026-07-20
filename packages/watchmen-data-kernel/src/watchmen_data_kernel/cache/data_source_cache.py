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
		# callbacks invoked whenever a builder is invalidated (e.g. on put/remove).
		# The async storage builder cache registers a callback here so that editing
		# a data source also drops its cached async engine.
		self._builder_invalidators: List[Callable[[DataSourceId], None]] = []

	def register_builder_invalidator(self, invalidator: Callable[[DataSourceId], None]) -> None:
		self._builder_invalidators.append(invalidator)

	def _fire_builder_invalidated(self, data_source_id: DataSourceId) -> None:
		for invalidator in self._builder_invalidators:
			try:
				invalidator(data_source_id)
			except Exception:
				# never let an invalidator failure break cache bookkeeping
				pass

	def put(self, data_source: DataSource) -> Optional[DataSource]:
		existing: Optional[DataSource] = self.byIdCache.put(data_source.dataSourceId, data_source)
		if existing:
			builder = self.get_builder(existing.dataSourceId)
			if builder is not None:
				self.builderByIdCache.remove(existing.dataSourceId)
				self._fire_builder_invalidated(existing.dataSourceId)
		return existing

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
		self._fire_builder_invalidated(data_source_id)
		return data_source

	def all(self) -> List[DataSource]:
		return list(self.byIdCache.values())

	def clear(self) -> None:
		self.byIdCache.clear()


data_source_cache = DataSourceCache()
