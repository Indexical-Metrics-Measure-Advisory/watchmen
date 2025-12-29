from typing import Optional, List

from watchmen_model.admin import Topic

from watchmen_collector_kernel.model import CollectorTableConfig

from watchmen_data_kernel.cache import InternalCache

from .collector_cache_manger import get_collector_topic_by_id_cache
from watchmen_collector_kernel.common import ask_collector_config_cache_enabled


class CollectorTopicCache:

	def __init__(self):
		self.ByIdCache = InternalCache(cache=get_collector_topic_by_id_cache)

	def put_topic_by_id(self, topic: Topic) -> Optional[Topic]:
		if ask_collector_config_cache_enabled():
			self.ByIdCache.remove(topic.topicId)
			existing_topic = self.ByIdCache.put(topic.topicId, topic)
			return existing_topic
		else:
			return None

	def get_topic_by_id(self, id_: str) -> Optional[Topic]:
		if ask_collector_config_cache_enabled():
			return self.ByIdCache.get(id_)
		else:
			return None

	def remove_topic_by_id(self, id_: str) -> Optional[Topic]:
		if ask_collector_config_cache_enabled():
			existing: Optional[CollectorTableConfig] = self.ByIdCache.remove(id_)
			return existing
		else:
			return None

	def clear(self) -> None:
		self.ByIdCache.clear()

	def all(self) -> List[Topic]:
		return list(self.ByIdCache.values())
	
collector_topic_cache = CollectorTopicCache()
