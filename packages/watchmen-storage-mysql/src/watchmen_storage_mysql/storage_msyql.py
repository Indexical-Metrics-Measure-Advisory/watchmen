from typing import List

from watchmen_model.common import DataPage
from watchmen_storage import StorageSPI
from watchmen_storage.storage_types import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, \
	EntityHelper, EntityId, EntityList, EntityPager, EntityUpdater


class StorageMySQL(StorageSPI):
	def __init__(self, engine):
		self.engine = engine

	def insert_one(self, one: Entity, helper: EntityHelper) -> Entity:
		pass

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> EntityList:
		pass

	def update_one(self, one: Entity, helper: EntityHelper) -> int:
		pass

	def update_only(self, updater: EntityUpdater) -> int:
		pass

	def update_only_and_pull(self, updater: EntityUpdater) -> Entity:
		pass

	def update(self, updater: EntityUpdater) -> int:
		pass

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		pass

	def delete_by_id(self, entity_id: EntityId, helper: EntityHelper) -> int:
		pass

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityHelper) -> Entity:
		pass

	def delete_only(self, deleter: EntityDeleter) -> int:
		pass

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Entity:
		pass

	def delete(self, deleter: EntityDeleter) -> int:
		pass

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		pass

	def find_by_id(self, entity_id: EntityId, helper: EntityHelper) -> Entity:
		pass

	def find_one(self, finder: EntityFinder) -> Entity:
		pass

	def find(self, finder: EntityFinder) -> EntityList:
		pass

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		pass

	def find_all(self, helper: EntityHelper) -> EntityList:
		pass

	def page(self, pager: EntityPager) -> DataPage:
		pass
