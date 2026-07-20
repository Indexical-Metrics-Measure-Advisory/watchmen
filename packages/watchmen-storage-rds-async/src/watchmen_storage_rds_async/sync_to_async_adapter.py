import asyncio
from typing import Any, Dict, List, Optional

from watchmen_model.system import DataSource
from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage
from watchmen_storage import AsyncTopicDataStorageSPI, Entity, EntityDeleter, EntityDistinctValuesFinder, \
	EntityFinder, EntityHelper, EntityId, EntityIdHelper, EntityList, EntityPager, EntityStraightValuesFinder, \
	EntityUpdater, FreeAggregatePager, FreeAggregator, FreeFinder, FreePager, TopicDataStorageSPI, \
	EntityLimitedFinder, EntityLimitedStraightValuesFinder


class SyncToAsyncTopicDataAdapter(AsyncTopicDataStorageSPI):
	"""
	Adapts a synchronous TopicDataStorageSPI to the AsyncTopicDataStorageSPI
	interface by running each call in a worker thread via asyncio.to_thread.

	This is used for database backends that have no mature async driver (e.g.
	MSSQL/pyodbc, Oracle/oracledb). It keeps the upper call chain uniformly async
	so that pipeline data services can await a single interface regardless of the
	underlying driver. True-async backends (asyncpg, aiomysql) use AsyncStorageRDS
	subclasses directly instead of this adapter.

	Note: because each operation runs in the default thread pool, this is not
	"true" async I/O - it merely prevents the event loop from being blocked. The
	synchronous storage instance must not be shared across concurrent coroutines
	that run in different threads simultaneously; callers obtain a fresh adapter
	instance per use (consistent with the existing ask_topic_storage pattern which
	returns a brand-new storage instance on every call).
	"""

	def __init__(self, sync_storage: TopicDataStorageSPI):
		self._sync = sync_storage

	@property
	def sync_storage(self) -> TopicDataStorageSPI:
		return self._sync

	async def connect(self) -> None:
		await asyncio.to_thread(self._sync.connect)

	async def close(self) -> None:
		await asyncio.to_thread(self._sync.close)

	async def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		await asyncio.to_thread(self._sync.insert_one, one, helper)

	async def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		await asyncio.to_thread(self._sync.insert_all, data, helper)

	async def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		return await asyncio.to_thread(self._sync.update_one, one, helper)

	async def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		return await asyncio.to_thread(self._sync.update_only, updater, peace_when_zero)

	async def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.update_only_and_pull, updater)

	async def update(self, updater: EntityUpdater) -> int:
		return await asyncio.to_thread(self._sync.update, updater)

	async def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		return await asyncio.to_thread(self._sync.update_and_pull, updater)

	async def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		return await asyncio.to_thread(self._sync.delete_by_id, entity_id, helper)

	async def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.delete_by_id_and_pull, entity_id, helper)

	async def delete_only(self, deleter: EntityDeleter) -> int:
		return await asyncio.to_thread(self._sync.delete_only, deleter)

	async def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.delete_only_and_pull, deleter)

	async def delete(self, deleter: EntityDeleter) -> int:
		return await asyncio.to_thread(self._sync.delete, deleter)

	async def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		return await asyncio.to_thread(self._sync.delete_and_pull, deleter)

	async def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.find_by_id, entity_id, helper)

	async def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.find_and_lock_by_id, entity_id, helper)

	async def find_and_lock_by_id_nowait(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.find_and_lock_by_id_nowait, entity_id, helper)

	async def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.find_one, finder)

	async def find_one_and_lock_nowait(self, finder: EntityFinder) -> Optional[Entity]:
		return await asyncio.to_thread(self._sync.find_one_and_lock_nowait, finder)

	async def find(self, finder: EntityFinder) -> EntityList:
		return await asyncio.to_thread(self._sync.find, finder)

	async def find_limited(self, finder: EntityLimitedFinder) -> EntityList:
		return await asyncio.to_thread(self._sync.find_limited, finder)

	async def find_for_update_skip_locked(self, finder: EntityLimitedFinder) -> EntityList:
		return await asyncio.to_thread(self._sync.find_for_update_skip_locked, finder)

	async def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		return await asyncio.to_thread(self._sync.find_distinct_values, finder)

	async def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		return await asyncio.to_thread(self._sync.find_straight_values, finder)

	async def find_limited_straight_values(self, finder: EntityLimitedStraightValuesFinder) -> EntityList:
		return await asyncio.to_thread(self._sync.find_limited_straight_values, finder)

	async def find_all(self, helper: EntityHelper) -> EntityList:
		return await asyncio.to_thread(self._sync.find_all, helper)

	async def page(self, pager: EntityPager) -> DataPage:
		return await asyncio.to_thread(self._sync.page, pager)

	async def exists(self, finder: EntityFinder) -> bool:
		return await asyncio.to_thread(self._sync.exists, finder)

	async def count(self, finder: EntityFinder) -> int:
		return await asyncio.to_thread(self._sync.count, finder)

	# ---- transactional ----

	async def begin(self) -> None:
		await asyncio.to_thread(self._sync.begin)

	async def commit_and_close(self) -> None:
		await asyncio.to_thread(self._sync.commit_and_close)

	async def rollback_and_close(self) -> None:
		await asyncio.to_thread(self._sync.rollback_and_close)

	def begin_managed(self) -> None:
		# The sync TransactionalStorageSPI does not declare begin_managed (it was
		# added on the async SPI). Guard with getattr so this adapter works whether
		# or not the wrapped sync storage implements managed transactions.
		fn = getattr(self._sync, 'begin_managed', None)
		if fn is not None:
			fn()

	async def end_managed(self, commit: bool) -> None:
		fn = getattr(self._sync, 'end_managed', None)
		if fn is not None:
			await asyncio.to_thread(fn, commit)

	def is_managed(self) -> bool:
		fn = getattr(self._sync, 'is_managed', None)
		if fn is not None:
			return fn()
		return False

	# ---- topic data ----

	async def register_topic(self, topic: Topic, datasource: DataSource) -> None:
		await asyncio.to_thread(self._sync.register_topic, topic, datasource)

	async def create_topic_entity(self, topic: Topic) -> None:
		await asyncio.to_thread(self._sync.create_topic_entity, topic)

	async def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		await asyncio.to_thread(self._sync.update_topic_entity, topic, original_topic)

	async def drop_topic_entity(self, topic: Topic) -> None:
		await asyncio.to_thread(self._sync.drop_topic_entity, topic)

	async def truncate(self, helper: EntityHelper) -> None:
		await asyncio.to_thread(self._sync.truncate, helper)

	async def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		return await asyncio.to_thread(self._sync.ask_synonym_factors, table_name)

	async def ask_reflect_factors(self, table_name: str, schema: str) -> List[Factor]:
		return await asyncio.to_thread(self._sync.ask_reflect_factors, table_name, schema)

	def is_free_find_supported(self) -> bool:
		return self._sync.is_free_find_supported()

	def append_topic_to_trino(self, topic: Topic) -> None:
		self._sync.append_topic_to_trino(topic)

	def drop_topic_from_trino(self, topic: Topic) -> None:
		self._sync.drop_topic_from_trino(topic)

	async def find_sql(self, finder: FreeFinder) -> str:
		return await asyncio.to_thread(self._sync.find_sql, finder)

	async def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		return await asyncio.to_thread(self._sync.free_find, finder)

	async def free_page(self, pager: FreePager) -> DataPage:
		return await asyncio.to_thread(self._sync.free_page, pager)

	async def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		return await asyncio.to_thread(self._sync.free_aggregate_find, aggregator)

	async def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		return await asyncio.to_thread(self._sync.free_aggregate_page, pager)
