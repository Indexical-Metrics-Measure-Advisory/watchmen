from collections.abc import Hashable
from typing import Any, Optional, Union

from cacheout import Cache

from watchmen_model.admin import Pipeline, Topic
from watchmen_model.system import DataSource
from .cache_manager import get_data_source_by_id_cache, get_pipeline_by_id_cache, get_topic_by_id_cache


class CacheService:
	@staticmethod
	def put(cache: Cache, key: Hashable, value: Any, ttl: Optional[Union[int, float]] = None) -> Optional[Any]:
		existing: Optional[Any] = cache.get(key, lambda: None)
		cache.set(key, value, ttl)
		return existing

	@staticmethod
	def pipeline(a_pipeline: Pipeline) -> Optional[Pipeline]:
		return CacheService.put(get_pipeline_by_id_cache(), a_pipeline.pipelineId, a_pipeline)

	@staticmethod
	def clear_pipeline_cache() -> None:
		get_pipeline_by_id_cache().clear()

	@staticmethod
	def topic(a_topic: Topic) -> Optional[Topic]:
		return CacheService.put(get_topic_by_id_cache(), a_topic.topicId, a_topic)

	@staticmethod
	def clear_topic_cache() -> None:
		get_topic_by_id_cache().clear()

	@staticmethod
	def data_source(a_data_source: DataSource) -> Optional[DataSource]:
		return CacheService.put(get_data_source_by_id_cache(), a_data_source.dataSourceId, a_data_source)

	@staticmethod
	def clear_data_source_cache() -> None:
		get_data_source_by_id_cache().clear()
