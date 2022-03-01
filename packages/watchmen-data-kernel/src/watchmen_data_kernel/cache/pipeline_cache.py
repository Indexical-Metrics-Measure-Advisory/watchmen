from abc import abstractmethod
from typing import List, Optional

from watchmen_model.admin import Pipeline
from watchmen_model.common import PipelineId
from watchmen_utilities import ArrayHelper
from .cache_manager import get_pipeline_by_id_cache
from .internal_cache import InternalCache
from .pipeline_by_topic_cache import pipeline_by_topic_cache


class PipelineCacheListener:
	@abstractmethod
	def on_pipeline_added(self, pipeline: Pipeline) -> None:
		pass

	@abstractmethod
	def on_pipeline_removed(self, pipeline: Pipeline) -> None:
		pass

	@abstractmethod
	def on_cache_cleared(self) -> None:
		pass


class PipelineCache:
	listeners: List[PipelineCacheListener] = []

	def __init__(self):
		self.byIdCache = InternalCache(cache=get_pipeline_by_id_cache)

	def add_cache_listener(self, listener: PipelineCacheListener) -> None:
		if listener not in self.listeners:
			self.listeners.append(listener)

	def fire_pipeline_added(self, pipeline: Pipeline):
		ArrayHelper(self.listeners).each(lambda x: x.on_pipeline_added(pipeline))

	def remove_cache_listener(self, listener: PipelineCacheListener) -> None:
		if listener in self.listeners:
			self.listeners.remove(listener)

	def fire_pipeline_removed(self, pipeline: Pipeline):
		ArrayHelper(self.listeners).each(lambda x: x.on_pipeline_removed(pipeline))

	def put(self, pipeline: Pipeline) -> Optional[Pipeline]:
		existing: Optional[Pipeline] = self.byIdCache.put(pipeline.pipelineId, pipeline)
		if existing is not None:
			self.fire_pipeline_removed(pipeline)
			if existing.topicId != pipeline.topicId:
				# trigger topic changed
				pipeline_by_topic_cache.remove_one(existing.topicId, existing.pipelineId)
				pipeline_by_topic_cache.append_one(pipeline.topicId, pipeline.pipelineId)
		else:
			# new pipline
			pipeline_by_topic_cache.append_one(pipeline.topicId, pipeline.pipelineId)
		self.fire_pipeline_added(pipeline)
		return existing

	def get(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		return self.byIdCache.get(pipeline_id)

	def remove(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		existing: Optional[Pipeline] = self.byIdCache.remove(pipeline_id)
		if existing is not None:
			pipeline_by_topic_cache.remove_one(existing.topicId, existing.pipelineId)
		return existing

	def all(self) -> List[Pipeline]:
		return list(self.byIdCache.values())

	def clear(self) -> None:
		self.byIdCache.clear()
		self.fire_cache_cleared()
		pipeline_by_topic_cache.clear()

	def fire_cache_cleared(self):
		ArrayHelper(self.listeners).each(lambda x: x.on_cache_cleared())


pipeline_cache = PipelineCache()
