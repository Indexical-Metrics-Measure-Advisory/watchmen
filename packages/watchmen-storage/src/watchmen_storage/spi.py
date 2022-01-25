from abc import ABC, abstractmethod
from typing import List

from watchmen_model.common import DataPage
from watchmen_storage.types import Entity, EntityColumnName, EntityColumnValue, EntityDeleter, \
	EntityFinder, EntityHelper, EntityId, EntityPager, EntityUpdater


class StorageSPI(ABC):

	@abstractmethod
	def insert_one(self, one: Entity, helper: EntityHelper) -> Entity:
		pass

	@abstractmethod
	def insert_all(self, data: List[Entity], helper: EntityHelper) -> List[Entity]:
		pass

	@abstractmethod
	def update_one(self, one: Entity, helper: EntityHelper) -> Entity:
		pass

	@abstractmethod
	def update_only(self, updater: EntityUpdater) -> int:
		pass

	@abstractmethod
	def update_only_and_pull(self, updater: EntityUpdater) -> Entity:
		pass

	@abstractmethod
	def update(self, updater: EntityUpdater) -> int:
		pass

	@abstractmethod
	def update_and_pull(self, updater: EntityUpdater) -> List[Entity]:
		pass

	@abstractmethod
	def delete_by_id(self, entity_id: EntityId, helper: EntityHelper) -> int:
		pass

	@abstractmethod
	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityHelper) -> Entity:
		pass

	@abstractmethod
	def delete_only(self, deleter: EntityDeleter) -> int:
		pass

	@abstractmethod
	def delete_only_and_pull(self, deleter: EntityDeleter) -> Entity:
		pass

	@abstractmethod
	def delete(self, deleter: EntityDeleter) -> int:
		pass

	@abstractmethod
	def delete_and_pull(self, deleter: EntityDeleter) -> List[Entity]:
		pass

	@abstractmethod
	def find_by_id(self, entity_id: EntityId, helper: EntityHelper) -> Entity:
		pass

	@abstractmethod
	def find_one(self, finder: EntityFinder) -> Entity:
		pass

	@abstractmethod
	def find(self, finder: EntityFinder) -> List[Entity]:
		pass

	@abstractmethod
	def find_distinct_values(
			self, distinct_column_name: EntityColumnName, finder: EntityFinder
	) -> List[EntityColumnValue]:
		pass

	@abstractmethod
	def find_all(self, helper: EntityHelper) -> List[Entity]:
		pass

	@abstractmethod
	def page(self, pager: EntityPager) -> DataPage:
		pass
