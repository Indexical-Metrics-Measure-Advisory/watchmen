from typing import List, Optional

from watchmen_model.common import PipelineId, TopicId
from watchmen_utilities import ArrayHelper
from .cache_manager import get_pipeline_by_topic_id_cache
from .internal_cache import InternalCache


class PipelineByTopicCache:
	def __init__(self):
		self.byTopicIdCache = InternalCache(cache=get_pipeline_by_topic_id_cache)

	def get(self, topic_id: TopicId) -> Optional[List[PipelineId]]:
		"""
		none means not initialized. empty list means no pipeline.
		"""
		return self.byTopicIdCache.get(topic_id)

	def declare_no_pipelines(self, topic_id: TopicId) -> None:
		self.byTopicIdCache.put(topic_id, [])

	def append_one(self, topic_id: TopicId, pipeline_id: PipelineId) -> None:
		"""
		append given pipeline id into by topic id cache
		"""
		pipeline_ids: Optional[List[PipelineId]] = self.byTopicIdCache.get(topic_id)
		if pipeline_ids is None:
			self.byTopicIdCache.put(topic_id, [pipeline_id])
		elif pipeline_id not in pipeline_ids:
			self.byTopicIdCache.put(topic_id, ArrayHelper(pipeline_ids).grab(pipeline_id).to_list())

	def remove_one(self, topic_id: TopicId, pipeline_id: PipelineId) -> None:
		"""
		remove given pipeline id from by topic id cache
		"""
		pipeline_ids: Optional[List[PipelineId]] = self.byTopicIdCache.get(topic_id)
		if pipeline_ids is not None:
			remains = ArrayHelper(pipeline_ids).filter(lambda x: x != pipeline_id).to_list()
			if len(remains) == 0:
				self.byTopicIdCache.remove(topic_id)
			else:
				self.byTopicIdCache.put(topic_id, remains)

	def remove(self, topic_id: TopicId) -> None:
		self.byTopicIdCache.remove(topic_id)

	def clear(self):
		self.byTopicIdCache.clear()


pipeline_by_topic_cache = PipelineByTopicCache()
