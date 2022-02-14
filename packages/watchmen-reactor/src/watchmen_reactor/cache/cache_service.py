from typing import Any, Callable, Hashable, List, Optional, Union

from cacheout import Cache

from watchmen_model.admin import Pipeline, Topic
from watchmen_model.common import DataSourceId, PipelineId, TenantId, TopicId
from watchmen_model.system import DataSource, Tenant
from watchmen_reactor.common import ask_cache_enabled
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import TransactionalStorageSPI
from watchmen_utilities import ArrayHelper
from .cache_manager import get_data_source_by_id_cache, get_data_storage_builder_by_id_cache, get_pipeline_by_id_cache, \
	get_pipeline_by_topic_id_cache, \
	get_tenant_by_id_cache, get_topic_by_id_cache, get_topic_by_tenant_and_name_cache, get_topic_schema_by_id_cache


class InternalCache:
	def __init__(self, cache: Callable[[], Cache]):
		if ask_cache_enabled():
			self.cache = cache()

	def put(self, key: Hashable, value: Any, ttl: Optional[Union[int, float]] = None) -> Optional[Any]:
		if not ask_cache_enabled():
			return None

		existing: Optional[Any] = self.cache.get(key, lambda: None)
		self.cache.set(key, value, ttl)
		return existing

	def get(self, key: Hashable, default_value: Optional[Any] = None) -> Optional[Any]:
		if not ask_cache_enabled():
			return None

		existing: Optional[Any] = self.cache.get(key, lambda: None)
		return existing if existing is not None else default_value

	def remove(self, key: Hashable) -> Optional[Any]:
		if not ask_cache_enabled():
			return None

		existing: Optional[Any] = self.cache.get(key, lambda: None)
		self.cache.delete(key)
		return existing

	def clear(self) -> None:
		if ask_cache_enabled():
			self.cache.clear()


class PipelineByTopicCache:
	def __init__(self):
		self.by_topic_id_cache = InternalCache(cache=get_pipeline_by_topic_id_cache)

	def get(self, topic_id: TopicId) -> List[PipelineId]:
		pipeline_ids: Optional[List[PipelineId]] = self.by_topic_id_cache.get(topic_id)
		return pipeline_ids if pipeline_ids is not None else []

	def append_one(self, topic_id: TopicId, pipeline_id: PipelineId) -> None:
		"""
		append given pipeline id into by topic id cache
		"""
		pipeline_ids: Optional[List[PipelineId]] = self.by_topic_id_cache.get(topic_id)
		if pipeline_ids is None:
			self.by_topic_id_cache.put(topic_id, [pipeline_id])
		elif pipeline_id not in pipeline_ids:
			self.by_topic_id_cache.put(topic_id, ArrayHelper(pipeline_ids).grab(pipeline_id).to_list())

	def remove_one(self, topic_id: TopicId, pipeline_id: PipelineId) -> None:
		"""
		remove given pipeline id from by topic id cache
		"""
		pipeline_ids: Optional[List[PipelineId]] = self.by_topic_id_cache.get(topic_id)
		if pipeline_ids is not None:
			self.by_topic_id_cache.put(topic_id, ArrayHelper(pipeline_ids).filter(lambda x: x != pipeline_id).to_list())

	def remove(self, topic_id: TopicId) -> None:
		self.by_topic_id_cache.remove(topic_id)

	def clear(self):
		self.by_topic_id_cache.clear()


pipeline_by_topic_cache = PipelineByTopicCache()


class PipelineCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_pipeline_by_id_cache)

	def put(self, pipeline: Pipeline) -> Optional[Pipeline]:
		existing: Optional[Pipeline] = self.by_id_cache.put(pipeline.pipelineId, pipeline)
		if existing is not None:
			if existing.topicId != pipeline.topicId:
				# trigger topic changed
				pipeline_by_topic_cache.remove_one(existing.topicId, existing.pipelineId)
				pipeline_by_topic_cache.append_one(pipeline.topicId, pipeline.pipelineId)
		else:
			# new pipline
			pipeline_by_topic_cache.append_one(pipeline.topicId, pipeline.pipelineId)
		return existing

	def get(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		return self.by_id_cache.get(pipeline_id)

	def remove(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		existing: Optional[Pipeline] = self.by_id_cache.remove(pipeline_id)
		if existing is not None:
			pipeline_by_topic_cache.remove_one(existing.topicId, existing.pipelineId)
		return existing

	def clear(self) -> None:
		self.by_id_cache.clear()
		pipeline_by_topic_cache.clear()


pipeline_cache = PipelineCache()


class TopicCache:
	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_topic_by_id_cache)
		self.by_tenant_and_name_cache = InternalCache(cache=get_topic_by_tenant_and_name_cache)
		self.schema_by_id_cache = InternalCache(cache=get_topic_schema_by_id_cache)

	# noinspection PyMethodMayBeStatic
	def to_tenant_and_name_key(self, name: str, tenant_id: TenantId) -> str:
		return f'{tenant_id}-{name}'

	def put(self, topic: Topic) -> Optional[Topic]:
		existing_topic = self.by_id_cache.put(topic.topicId, topic)
		self.by_tenant_and_name_cache.put(
			self.to_tenant_and_name_key(topic.name, topic.tenantId), topic)
		self.schema_by_id_cache.put(topic.topicId, TopicSchema(topic))
		return existing_topic

	def get(self, topic_id: TopicId) -> Optional[Topic]:
		return self.by_id_cache.get(topic_id)

	def get_schema(self, topic_id: TopicId) -> Optional[TopicSchema]:
		return self.schema_by_id_cache.get(topic_id)

	def get_by_name(self, name: str, tenant_id: TenantId) -> Optional[Topic]:
		return self.by_tenant_and_name_cache.get(self.to_tenant_and_name_key(name, tenant_id))

	def remove(self, topic_id: TopicId) -> Optional[Topic]:
		existing: Optional[Topic] = self.by_id_cache.remove(topic_id)
		if existing is not None:
			pipeline_by_topic_cache.remove(topic_id)
			self.by_tenant_and_name_cache.remove(self.to_tenant_and_name_key(existing.name, existing.tenantId))
		self.schema_by_id_cache.remove(topic_id)
		return existing

	def clear(self) -> None:
		self.by_id_cache.clear()
		self.by_tenant_and_name_cache.clear()
		self.schema_by_id_cache.clear()
		pipeline_by_topic_cache.clear()


# noinspection DuplicatedCode
class DataSourceCache:
	"""
	data source cache will not impact other caches
	"""

	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_data_source_by_id_cache)
		self.builder_by_id_cache = InternalCache(cache=get_data_storage_builder_by_id_cache)

	def put(self, data_source: DataSource) -> Optional[DataSource]:
		return self.by_id_cache.put(data_source.dataSourceId, data_source)

	def put_builder(
			self, data_source_id: DataSourceId, builder: Callable[[], TransactionalStorageSPI]
	) -> Optional[Callable[[], TransactionalStorageSPI]]:
		return self.builder_by_id_cache.put(data_source_id, builder)

	def get(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		return self.by_id_cache.get(data_source_id)

	def get_builder(self, data_source_id: DataSourceId) -> Optional[Callable[[], TransactionalStorageSPI]]:
		return self.builder_by_id_cache.get(data_source_id)

	def remove(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		return self.by_id_cache.remove(data_source_id)

	def remove_builder(self, data_source_id: DataSourceId) -> Optional[Callable[[], TransactionalStorageSPI]]:
		return self.builder_by_id_cache.remove(data_source_id)

	def clear(self) -> None:
		self.by_id_cache.clear()


topic_cache = TopicCache()
data_source_cache = DataSourceCache()


# noinspection DuplicatedCode
class TenantCache:
	"""
	tenant cache will not impact other caches
	"""

	def __init__(self):
		self.by_id_cache = InternalCache(cache=get_tenant_by_id_cache)

	def put(self, tenant: Tenant) -> Optional[Tenant]:
		return self.by_id_cache.put(tenant.tenantId, tenant)

	def get(self, tenant_id: TenantId) -> Optional[Tenant]:
		return self.by_id_cache.get(tenant_id)

	def remove(self, tenant_id: TenantId) -> Optional[Tenant]:
		return self.by_id_cache.remove(tenant_id)

	def clear(self) -> None:
		self.by_id_cache.clear()


tenant_cache = TenantCache()


class CacheService:
	@staticmethod
	def pipeline() -> PipelineCache:
		return pipeline_cache

	@staticmethod
	def topic() -> TopicCache:
		return topic_cache

	@staticmethod
	def pipelines_by_topic() -> PipelineByTopicCache:
		return pipeline_by_topic_cache

	@staticmethod
	def data_source() -> DataSourceCache:
		return data_source_cache

	@staticmethod
	def tenant() -> TenantCache:
		return tenant_cache

	@staticmethod
	def clear_all() -> None:
		CacheService.pipeline().clear()
		CacheService.topic().clear()
		CacheService.pipelines_by_topic().clear()
		CacheService.data_source().clear()
		CacheService.tenant().clear()

# TODO cache refresher, with heart beat
