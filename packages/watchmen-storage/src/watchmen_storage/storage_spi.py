from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage
from .free_storage_types import FreeAggregatePager, FreeAggregator, FreeFinder, FreePager
from .storage_types import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityPager, EntityStraightValuesFinder, EntityUpdater


class StorageSPI(ABC):
	@abstractmethod
	def connect(self) -> None:
		"""
		connect when not connected, or do nothing if connected.
		call close when want to connect again. connection is autocommit.
		this method can be called multiple times, if there is a connection existing, do nothing
		"""
		pass

	@abstractmethod
	def close(self) -> None:
		pass

	@abstractmethod
	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		pass

	@abstractmethod
	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		pass

	@abstractmethod
	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		"""
		returns 0 when update none, or 1 when update one
		"""
		pass

	@abstractmethod
	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		"""
		update only one, if update none or more than one item, raise exception
		"""
		pass

	@abstractmethod
	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		"""
		update only one, if update none or more than one item, raise exception
		return the one before update
		"""
		pass

	@abstractmethod
	def update(self, updater: EntityUpdater) -> int:
		pass

	@abstractmethod
	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		pass

	@abstractmethod
	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		"""
		returns 0 when delete none, or 1 when delete one
		"""
		pass

	@abstractmethod
	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		return deleted none when delete none, or deleted one when delete one
		"""
		pass

	@abstractmethod
	def delete_only(self, deleter: EntityDeleter) -> int:
		"""
		delete only one, if delete none or more than one item, raise exception
		"""
		pass

	@abstractmethod
	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		"""
		delete only one, if delete none or more than one item, raise exception
		return the one before delete
		"""
		pass

	@abstractmethod
	def delete(self, deleter: EntityDeleter) -> int:
		pass

	@abstractmethod
	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		pass

	@abstractmethod
	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	@abstractmethod
	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	@abstractmethod
	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		pass

	@abstractmethod
	def find(self, finder: EntityFinder) -> EntityList:
		pass

	@abstractmethod
	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		"""
		filled values with given distinct columns, returns an entity list.
		entity is deserialized by shaper
		"""
		pass

	@abstractmethod
	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		"""
		fill values with given straight columns, returns an entity list
		entity will not be deserialized by shaper.
		And when there is aggregated columns, other columns will be used in group by
		"""
		pass

	@abstractmethod
	def find_all(self, helper: EntityHelper) -> EntityList:
		pass

	@abstractmethod
	def page(self, pager: EntityPager) -> DataPage:
		pass

	@abstractmethod
	def exists(self, finder: EntityFinder) -> bool:
		pass

	@abstractmethod
	def count(self, finder: EntityFinder) -> int:
		pass


class TransactionalStorageSPI(StorageSPI):
	"""
	Example:
		def a_func():
			# Declare a storage and begin it explicitly\n
			storage = TransactionStorageSPI()
			storage.begin()\n

			# Then do logic with transaction\n
			try:
				# do some logic\n
				storage.commit_and_close()
			except:
				storage.rollback_and_close()

			# Or do logic with no transaction.\n
			# Use this pattern only when no write logic included\n
			try:
				# do some read logic\n
			finally:
				storage.close()
	"""

	@abstractmethod
	def begin(self) -> None:
		pass

	@abstractmethod
	def commit_and_close(self) -> None:
		"""
		1. commit successfully -> close
		2. commit failed -> throw exception
		"""
		pass

	@abstractmethod
	def rollback_and_close(self) -> None:
		"""
		1. rollback successfully -> close
		2. rollback failed -> close
		"""
		pass


class TopicDataStorageSPI(TransactionalStorageSPI):
	@abstractmethod
	def register_topic(self, topic: Topic) -> None:
		pass

	@abstractmethod
	def create_topic_entity(self, topic: Topic) -> None:
		pass

	@abstractmethod
	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		pass

	@abstractmethod
	def drop_topic_entity(self, topic: Topic) -> None:
		pass

	@abstractmethod
	def truncate(self, helper: EntityHelper) -> None:
		pass

	@abstractmethod
	def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		pass

	# noinspection PyMethodMayBeStatic
	def is_free_find_supported(self) -> bool:
		return True

	def append_topic_to_trino(self, topic: Topic) -> None:
		pass

	def drop_topic_from_trino(self, topic: Topic) -> None:
		pass

	@abstractmethod
	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		pass

	@abstractmethod
	def free_page(self, pager: FreePager) -> DataPage:
		pass

	@abstractmethod
	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	@abstractmethod
	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass
