from abc import ABC, abstractmethod
from typing import List, Optional

from watchmen_model.common import DataPage
from .storage_types import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityPager, EntityUpdater


class StorageSPI(ABC):
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
	def update_only(self, updater: EntityUpdater) -> int:
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
	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		pass

	@abstractmethod
	def find(self, finder: EntityFinder) -> EntityList:
		pass

	@abstractmethod
	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		"""
		filled values with given distinct columns event returns an entity list
		"""
		pass

	@abstractmethod
	def find_all(self, helper: EntityHelper) -> EntityList:
		pass

	@abstractmethod
	def page(self, pager: EntityPager) -> DataPage:
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

	@abstractmethod
	def close(self) -> None:
		pass
