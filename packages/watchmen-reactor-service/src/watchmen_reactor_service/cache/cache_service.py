from typing import Any, Callable, Hashable, List, Optional, Union

from cacheout import Cache

from watchmen_model.admin import Pipeline, Topic
from watchmen_model.common import DataSourceId, PipelineId, TopicId
from watchmen_model.system import DataSource
from watchmen_reactor_service.settings import ask_cache_enabled
from watchmen_utilities import ArrayHelper
from .cache_manager import get_data_source_by_id_cache, get_pipeline_by_id_cache, get_pipeline_by_topic_id_cache, \
	get_topic_by_id_cache


class InternalCache:
	def __init__(self, cache: Callable[[], Cache]):
		if ask_cache_enabled():
			self.cache = cache()

	def put(self, key: Hashable, value: Any, ttl: Optional[Union[int, float]] = None) -> Optional[Any]:
		existing: Optional[Any] = self.cache.get(key, lambda: None)
		self.cache.set(key, value, ttl)
		return existing

	def get(self, key: Hashable, default_value: Optional[Any] = None) -> Optional[Any]:
		existing: Optional[Any] = self.cache.get(key, lambda: None)
		return existing if existing is not None else default_value

	def remove(self, key: Hashable) -> Optional[Any]:
		existing: Optional[Any] = self.cache.get(key, lambda: None)
		self.cache.delete(key)
		return existing

	def clear(self) -> None:
		self.cache.clear()


class PipelineByTopicCache:
	def __init__(self):
		self.by_topic_id_cache = InternalCache(cache=get_pipeline_by_topic_id_cache)

	def append(self, topic_id: TopicId, pipeline_id: PipelineId) -> None:
		"""
		append given pipeline id into by topic id cache
		"""
		pipeline_ids: Optional[List[PipelineId]] = self.by_topic_id_cache.get(topic_id)
		if pipeline_ids is None:
			self.by_topic_id_cache.put(topic_id, [pipeline_id])
		elif pipeline_id not in pipeline_ids:
			self.by_topic_id_cache.put(topic_id, ArrayHelper(pipeline_ids).grab(pipeline_id).to_list())

	def remove(self, topic_id: TopicId, pipeline_id: PipelineId) -> None:
		"""
		remove given pipeline id from by topic id cache
		"""
		pipeline_ids: Optional[List[PipelineId]] = self.by_topic_id_cache.get(topic_id)
		if pipeline_ids is not None:
			self.by_topic_id_cache.put(topic_id, ArrayHelper(pipeline_ids).filter(lambda x: x != pipeline_id).to_list())

	def clear(self):
		self.by_topic_id_cache.clear()


class PipelineCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_pipeline_by_id_cache)
		self.by_topic_id_cache = PipelineByTopicCache()

	def put(self, pipeline: Pipeline) -> Optional[Pipeline]:
		existing: Optional[Pipeline] = self.by_id_cache.put(pipeline.pipelineId, pipeline)
		if existing is not None:
			if existing.topicId != pipeline.topicId:
				# trigger topic changed
				self.by_topic_id_cache.remove(existing.topicId, existing.pipelineId)
				self.by_topic_id_cache.append(pipeline.topicId, pipeline.pipelineId)
		else:
			# new pipline
			self.by_topic_id_cache.append(pipeline.topicId, pipeline.pipelineId)
		return existing

	def get(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		return self.get(pipeline_id)

	def remove(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		existing: Optional[Pipeline] = self.by_id_cache.remove(pipeline_id)
		if existing is not None:
			self.by_topic_id_cache.remove(existing.topicId, existing.pipelineId)
		return existing

	def clear(self) -> None:
		self.by_id_cache.clear()
		self.by_topic_id_cache.clear()


class TopicCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_topic_by_id_cache)

	def put(self, topic: Topic) -> Optional[Topic]:
		return self.by_id_cache.put(topic.topicId, topic)

	def get(self, topic_id: TopicId) -> Optional[Topic]:
		return self.get(topic_id)

	def remove(self, topic_id: TopicId) -> Optional[Topic]:
		return self.by_id_cache.remove(topic_id)

	def clear(self) -> None:
		self.by_id_cache.clear()


class DataSourceCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_data_source_by_id_cache)

	def put(self, data_source: DataSource) -> Optional[DataSource]:
		return self.by_id_cache.put(data_source.topicId, data_source)

	def get(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		return self.get(data_source_id)

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
