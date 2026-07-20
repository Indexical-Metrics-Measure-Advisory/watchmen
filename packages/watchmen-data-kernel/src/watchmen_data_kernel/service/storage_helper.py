from typing import Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.storage.topic_storage import build_topic_data_storage, build_topic_data_storage_async
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Topic
from watchmen_storage import AsyncTopicDataStorageSPI, TopicDataStorageSPI
from watchmen_utilities import is_blank


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


def ask_topic_storage(
		topic_or_schema: Union[Topic, TopicSchema], principal_service: PrincipalService) -> TopicDataStorageSPI:
	topic = topic_or_schema if isinstance(topic_or_schema, Topic) else topic_or_schema.get_topic()
	data_source_id = topic.dataSourceId
	if is_blank(data_source_id):
		raise DataKernelException(
			f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')

	build = CacheService.data_source().get_builder(data_source_id)
	if build is not None:
		return build()

	data_source = get_data_source_service(principal_service).find_by_id(data_source_id)
	if data_source is None:
		raise DataKernelException(
			f'Data source not declared for topic'
			f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

	build = build_topic_data_storage(data_source)
	CacheService.data_source().put_builder(data_source_id, build)
	return build()


# A separate cache namespace for async builders, so sync and async builders for
# the same data source do not clobber each other.
_async_builder_cache: dict = {}


def _invalidate_async_builder(data_source_id) -> None:
	"""Drop a cached async builder (and thus its async engine) when the sync
	DataSourceCache invalidates the corresponding sync builder, e.g. when a data
	source is edited or deleted. Prevents stale engines/wrong-DB after a config
	change."""
	_async_builder_cache.pop(data_source_id, None)


# Register once at import so DataSourceCache.put/remove evict async builders too.
CacheService.data_source().register_builder_invalidator(_invalidate_async_builder)


async def ask_topic_storage_async(
		topic_or_schema: Union[Topic, TopicSchema], principal_service: PrincipalService) -> AsyncTopicDataStorageSPI:
	"""
	Asynchronous counterpart of ask_topic_storage. Resolves (and caches) an
	AsyncTopicDataStorageSPI builder for the topic's data source, then invokes it
	to yield a fresh async storage instance. The builder (which owns the shared
	async engine) is cached; a new storage wrapper is created per call, mirroring
	the sync behaviour.

	Declared async for end-to-end async-chain consistency: callers `await` it, and
	any future engine-creation or datasource-lookup work that becomes async can be
	awaited here without changing call sites.
	"""
	topic = topic_or_schema if isinstance(topic_or_schema, Topic) else topic_or_schema.get_topic()
	data_source_id = topic.dataSourceId
	if is_blank(data_source_id):
		raise DataKernelException(
			f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')

	build = _async_builder_cache.get(data_source_id)
	if build is not None:
		return build()

	data_source = get_data_source_service(principal_service).find_by_id(data_source_id)
	if data_source is None:
		raise DataKernelException(
			f'Data source not declared for topic'
			f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

	build = build_topic_data_storage_async(data_source)
	_async_builder_cache[data_source_id] = build
	return build()


def clear_async_storage_cache() -> None:
	"""Clear the cached async storage builders (e.g. when a data source changes)."""
	_async_builder_cache.clear()

