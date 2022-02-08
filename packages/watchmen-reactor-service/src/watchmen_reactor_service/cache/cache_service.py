from typing import Any, Hashable, Optional, Union

from cacheout import Cache

from watchmen_model.admin import Pipeline, Topic
from watchmen_model.common import DataSourceId, PipelineId, TopicId
from watchmen_model.system import DataSource
from .cache_manager import get_data_source_by_id_cache, get_pipeline_by_id_cache, get_topic_by_id_cache


class InternalCache:
	def __init__(self, cache: Cache):
		self.cache = cache

	def put(self, key: Hashable, value: Any, ttl: Optional[Union[int, float]] = None) -> Optional[Any]:
		existing: Optional[Any] = self.cache.get(key, lambda: None)
		self.cache.set(key, value, ttl)
		return existing

	def remove(self, key: Hashable) -> Optional[Any]:
		existing: Optional[Any] = self.cache.get(key, lambda: None)
		self.cache.delete(key)
		return existing

	def clear(self) -> None:
		self.cache.clear()


class PipelineCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_pipeline_by_id_cache())

	def put(self, pipeline: Pipeline) -> Optional[Pipeline]:
		return self.by_id_cache.put(pipeline.pipelineId, pipeline)

	def remove(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		return self.by_id_cache.remove(pipeline_id)

	def clear(self) -> None:
		self.by_id_cache.clear()


class TopicCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_topic_by_id_cache())

	def put(self, topic: Topic) -> Optional[Topic]:
		return self.by_id_cache.put(topic.topicId, topic)

	def remove(self, topic_id: TopicId) -> Optional[Topic]:
		return self.by_id_cache.remove(topic_id)

	def clear(self) -> None:
		self.by_id_cache.clear()


class DataSourceCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_data_source_by_id_cache())

	def put(self, data_source: DataSource) -> Optional[DataSource]:
		return self.by_id_cache.put(data_source.topicId, data_source)

	def remove(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		return self.by_id_cache.remove(data_source_id)

	def clear(self) -> None:
		self.by_id_cache.clear()


pipeline_cache = PipelineCache()
topic_cache = TopicCache()
data_source_cache = DataSourceCache()


class CacheService:
	@staticmethod
	def pipeline() -> PipelineCache:
		return pipeline_cache

	@staticmethod
	def topic() -> TopicCache:
		return topic_cache

	@staticmethod
	def data_source() -> DataSourceCache:
		return data_source_cache
