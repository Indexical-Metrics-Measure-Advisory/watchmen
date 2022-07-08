from abc import abstractmethod
from typing import Any, Dict, List, Optional

from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage
from watchmen_storage import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityPager, EntityStraightValuesFinder, EntityUpdater, FreeAggregatePager, \
	FreeAggregator, FreeFinder, FreePager, TopicDataStorageSPI
from .exception import InquiryTrinoException


class TrinoStorageSPI(TopicDataStorageSPI):
	def create_topic_entity(self, topic: Topic) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[create_topic_entity] does not support by trino storage.')

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[update_topic_entity] does not support by trino storage.')

	def drop_topic_entity(self, topic: Topic) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[drop_topic_entity] does not support by trino storage.')

	def truncate(self, helper: EntityHelper) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[truncate] does not support by trino storage.')

	def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[ask_synonym_factors] does not support by trino storage.')

	def begin(self) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[begin] does not support by trino storage.')

	def commit_and_close(self) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[commit_and_close] does not support by trino storage.')

	def rollback_and_close(self) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[rollback_and_close] does not support by trino storage.')

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[insert_one] does not support by trino storage.')

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[insert_all] does not support by trino storage.')

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[update_one] does not support by trino storage.')

	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[update_only] does not support by trino storage.')

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[update_only_and_pull] does not support by trino storage.')

	def update(self, updater: EntityUpdater) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[update] does not support by trino storage.')

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[update_and_pull] does not support by trino storage.')

	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[delete_by_id] does not support by trino storage.')

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[delete_by_id_and_pull] does not support by trino storage.')

	def delete_only(self, deleter: EntityDeleter) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[delete_only] does not support by trino storage.')

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[delete_only_and_pull] does not support by trino storage.')

	def delete(self, deleter: EntityDeleter) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[delete] does not support by trino storage.')

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[delete_and_pull] does not support by trino storage.')

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find_by_id] does not support by trino storage.')

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find_and_lock_by_id] does not support by trino storage.')

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find_one] does not support by trino storage.')

	def find(self, finder: EntityFinder) -> EntityList:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find] does not support by trino storage.')

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find_distinct_values] does not support by trino storage.')

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find_straight_values] does not support by trino storage.')

	def find_all(self, helper: EntityHelper) -> EntityList:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[find_all] does not support by trino storage.')

	def page(self, pager: EntityPager) -> DataPage:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[page] does not support by trino storage.')

	def exists(self, finder: EntityFinder) -> bool:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[exists] does not support by trino storage.')

	def count(self, finder: EntityFinder) -> int:
		"""
		not supported by trino
		"""
		raise InquiryTrinoException('Method[count] does not support by trino storage.')

	@abstractmethod
	def register_topic(self, topic: Topic) -> None:
		pass

	@abstractmethod
	def connect(self) -> None:
		pass

	@abstractmethod
	def close(self) -> None:
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
