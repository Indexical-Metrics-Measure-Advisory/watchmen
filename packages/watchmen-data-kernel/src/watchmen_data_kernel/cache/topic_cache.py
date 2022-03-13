from typing import List, Optional

from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId, TopicId
from .cache_manager import get_topic_by_id_cache, get_topic_by_tenant_and_name_cache, \
	get_topic_entity_helper_by_id_cache, get_topic_schema_by_id_cache
from .internal_cache import InternalCache
from .pipeline_by_topic_cache import pipeline_by_topic_cache


class TopicCache:
	def __init__(self):
		self.byIdCache = InternalCache(cache=get_topic_by_id_cache)
		self.byTenantAndNameCache = InternalCache(cache=get_topic_by_tenant_and_name_cache)
		self.schemaByIdCache = InternalCache(cache=get_topic_schema_by_id_cache)
		self.entityHelperByIdCache = InternalCache(cache=get_topic_entity_helper_by_id_cache)

	# noinspection PyMethodMayBeStatic
	def to_tenant_and_name_key(self, name: str, tenant_id: TenantId) -> str:
		return f'{tenant_id}-{name}'

	def put(self, topic: Topic) -> Optional[Topic]:
		# topic is changed, remove from entity helper cache anyway
		self.entityHelperByIdCache.remove(topic.topicId)
		# refresh other caches
		existing_topic = self.byIdCache.put(topic.topicId, topic)
		self.byTenantAndNameCache.put(
			self.to_tenant_and_name_key(topic.name, topic.tenantId), topic)
		self.schemaByIdCache.put(topic.topicId, TopicSchema(topic))
		return existing_topic

	def put_entity_helper(self, entity_helper: TopicDataEntityHelper) -> Optional[TopicDataEntityHelper]:
		return self.entityHelperByIdCache.put(entity_helper.get_topic().topicId, entity_helper)

	def get(self, topic_id: TopicId) -> Optional[Topic]:
		return self.byIdCache.get(topic_id)

	def get_schema(self, topic_id: TopicId) -> Optional[TopicSchema]:
		return self.schemaByIdCache.get(topic_id)

	def get_entity_helper(self, topic_id: TopicId) -> Optional[TopicDataEntityHelper]:
		return self.entityHelperByIdCache.get(topic_id)

	def get_by_name(self, name: str, tenant_id: TenantId) -> Optional[Topic]:
		return self.byTenantAndNameCache.get(self.to_tenant_and_name_key(name, tenant_id))

	def remove(self, topic_id: TopicId) -> Optional[Topic]:
		existing: Optional[Topic] = self.byIdCache.remove(topic_id)
		if existing is not None:
			pipeline_by_topic_cache.remove(topic_id)
			self.byTenantAndNameCache.remove(self.to_tenant_and_name_key(existing.name, existing.tenantId))
		self.schemaByIdCache.remove(topic_id)
		self.entityHelperByIdCache.remove(topic_id)
		return existing

	def all(self) -> List[Topic]:
		return list(self.byIdCache.values())

	def clear(self) -> None:
		self.byIdCache.clear()
		self.byTenantAndNameCache.clear()
		self.schemaByIdCache.clear()
		self.entityHelperByIdCache.clear()
		pipeline_by_topic_cache.clear()


topic_cache = TopicCache()
