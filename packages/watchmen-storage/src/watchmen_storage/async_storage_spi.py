from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from watchmen_model.system import DataSource
from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage
from .free_storage_types import FreeAggregatePager, FreeAggregator, FreeFinder, FreePager
from .storage_types import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityPager, EntityStraightValuesFinder, EntityUpdater, EntityLimitedFinder, \
	EntityLimitedStraightValuesFinder


class AsyncStorageSPI(ABC):
	"""
	Asynchronous counterpart of StorageSPI. Every method is a coroutine so that
	true async drivers (e.g. asyncpg, aiomysql) can be used, and the event loop
	is never blocked by database I/O. The method signatures mirror StorageSPI
	one-to-one, only adding async.
	"""

	@abstractmethod
	async def connect(self) -> None:
		"""
		connect when not connected, or do nothing if connected.
		call close when want to connect again. connection is autocommit.
		this method can be called multiple times, if there is a connection existing, do nothing
		"""
		pass

	@abstractmethod
	async def close(self) -> None:
		pass

	@abstractmethod
	async def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		pass

	@abstractmethod
	async def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		pass

	@abstractmethod
	async def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		"""
		returns 0 when update none, or 1 when update one
		"""
		pass

	@abstractmethod
	async def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		"""
		update only one, if update none or more than one item, raise exception
		"""
		pass

	@abstractmethod
	async def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		"""
		update only one, if update none or more than one item, raise exception
		return the one before update
		"""
		pass

	@abstractmethod
	async def update(self, updater: EntityUpdater) -> int:
		pass

	@abstractmethod
	async def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		pass

	@abstractmethod
	async def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		"""
		returns 0 when delete none, or 1 when delete one
		"""
		pass

	@abstractmethod
	async def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		return deleted none when delete none, or deleted one when delete one
		"""
		pass

	@abstractmethod
	async def delete_only(self, deleter: EntityDeleter) -> int:
		"""
		delete only one, if delete none or more than one item, raise exception
		"""
		pass

	@abstractmethod
	async def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		"""
		delete only one, if delete none or more than one item, raise exception
		return the one before delete
		"""
		pass

	@abstractmethod
	async def delete(self, deleter: EntityDeleter) -> int:
		pass

	@abstractmethod
	async def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		pass

	@abstractmethod
	async def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	@abstractmethod
	async def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	@abstractmethod
	async def find_and_lock_by_id_nowait(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	@abstractmethod
	async def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		pass

	@abstractmethod
	async def find_one_and_lock_nowait(self, finder: EntityFinder) -> Optional[Entity]:
		pass

	@abstractmethod
	async def find(self, finder: EntityFinder) -> EntityList:
		pass

	@abstractmethod
	async def find_limited(self, finder: EntityLimitedFinder) -> EntityList:
		pass

	@abstractmethod
	async def find_for_update_skip_locked(self, finder: EntityLimitedFinder) -> EntityList:
		pass

	@abstractmethod
	async def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		"""
		filled values with given distinct columns, returns an entity list.
		entity is deserialized by shaper
		"""
		pass

	@abstractmethod
	async def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		"""
		fill values with given straight columns, returns an entity list
		entity will not be deserialized by shaper.
		And when there is aggregated columns, other columns will be used in group by
		"""
		pass

	@abstractmethod
	async def find_limited_straight_values(self, finder: EntityLimitedStraightValuesFinder) -> EntityList:
		"""
		fill values with given straight columns, returns an entity list
		entity will not be deserialized by shaper.
		And when there is aggregated columns, other columns will be used in group by
		"""
		pass

	@abstractmethod
	async def find_all(self, helper: EntityHelper) -> EntityList:
		pass

	@abstractmethod
	async def page(self, pager: EntityPager) -> DataPage:
		pass

	@abstractmethod
	async def exists(self, finder: EntityFinder) -> bool:
		pass

	@abstractmethod
	async def count(self, finder: EntityFinder) -> int:
		pass


class AsyncTransactionalStorageSPI(AsyncStorageSPI):
	"""
	Asynchronous counterpart of TransactionalStorageSPI.

	Example:
		storage = AsyncTransactionalStorageSPI()
		await storage.begin()
		try:
			# do some logic
			await storage.commit_and_close()
		except:
			await storage.rollback_and_close()

		# Or do logic with no transaction.
		# Use this pattern only when no write logic included
		try:
			# do some read logic
		finally:
			await storage.close()
	"""

	def begin_managed(self) -> None:
		"""
		Begin a managed transaction. The connection will be kept open until end_managed is called.
		Subsequent connect() and close() calls will be no-op while managed.
		Default implementation is no-op. Override in subclasses that support managed transactions.
		"""
		pass

	async def end_managed(self, commit: bool) -> None:
		"""
		End the managed transaction. Commit or rollback, then close the connection.
		Default implementation is no-op. Override in subclasses that support managed transactions.
		"""
		pass

	def is_managed(self) -> bool:
		"""
		Returns True if the storage is currently in managed transaction mode.
		Default implementation returns False.
		"""
		return False

	@abstractmethod
	async def begin(self) -> None:
		pass

	@abstractmethod
	async def commit_and_close(self) -> None:
		"""
		1. commit successfully -> close
		2. commit failed -> throw exception
		"""
		pass

	@abstractmethod
	async def rollback_and_close(self) -> None:
		"""
		1. rollback successfully -> close
		2. rollback failed -> close
		"""
		pass


class AsyncTopicDataStorageSPI(AsyncTransactionalStorageSPI):
	@abstractmethod
	async def register_topic(self, topic: Topic, datasource: DataSource) -> None:
		pass

	@abstractmethod
	async def create_topic_entity(self, topic: Topic) -> None:
		pass

	@abstractmethod
	async def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		pass

	@abstractmethod
	async def drop_topic_entity(self, topic: Topic) -> None:
		pass

	@abstractmethod
	async def truncate(self, helper: EntityHelper) -> None:
		pass

	@abstractmethod
	async def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		pass

	@abstractmethod
	async def ask_reflect_factors(self, table_name: str, schema: str) -> List[Factor]:
		pass

	# noinspection PyMethodMayBeStatic
	def is_free_find_supported(self) -> bool:
		return True

	def append_topic_to_trino(self, topic: Topic) -> None:
		pass

	def drop_topic_from_trino(self, topic: Topic) -> None:
		pass

	@abstractmethod
	async def find_sql(self, finder: FreeFinder) -> str:
		pass

	@abstractmethod
	async def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		pass

	@abstractmethod
	async def free_page(self, pager: FreePager) -> DataPage:
		pass

	@abstractmethod
	async def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	@abstractmethod
	async def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass
