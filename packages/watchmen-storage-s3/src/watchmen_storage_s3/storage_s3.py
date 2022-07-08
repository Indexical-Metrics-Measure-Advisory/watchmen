from logging import getLogger
from typing import Any, Dict, List, Optional

from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage
from watchmen_storage import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityPager, EntityStraightValuesFinder, EntityUpdater, FreeAggregatePager, \
	FreeAggregator, FreeFinder, FreePager, TopicDataStorageSPI, TransactionalStorageSPI, UnexpectedStorageException
from .object_defs_s3 import find_directory, register_directory
from .simple_storage_service import SimpleStorageService

logger = getLogger(__name__)


class StorageS3(TransactionalStorageSPI):
	def __init__(self, s3_client: SimpleStorageService):
		self.s3_client = s3_client

	def begin(self) -> None:
		# begin is not required in S3
		pass

	def commit_and_close(self) -> None:
		"""
		1. commit successfully -> close
		2. commit failed -> throw exception
		"""
		# commit_and_close is not required in S3
		pass

	def rollback_and_close(self) -> None:
		"""
		1. rollback successfully -> close
		2. rollback failed -> close
		"""
		# rollback_and_close is not required in S3
		pass

	def connect(self) -> None:
		"""
		connect when not connected, or do nothing if connected.
		call close when want to connect again. connection is autocommit.
		this method can be called multiple times, if there is a connection existing, do nothing
		"""
		# connect is not required in S3
		pass

	def close(self) -> None:
		# close is not required in S3
		pass

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		directory = find_directory(helper.name)
		row = helper.shaper.serialize(one)
		key = self.s3_client.gen_key(directory, str(row['id_']))
		self.s3_client.put_object(key, row)

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		for one in data:
			self.insert_one(one, helper)

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		"""
		returns 0 when update none, or 1 when update one
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[update_one] does not support by S3 storage.')

	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		"""
		update only one, if update none or more than one item, raise exception
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[update_only] does not support by S3 storage.')

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		"""
		update only one, if update none or more than one item, raise exception
		return the one before update
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[update_only_and_pull] does not support by S3 storage.')

	def update(self, updater: EntityUpdater) -> int:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[update] does not support by S3 storage.')

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[update_and_pull] does not support by S3 storage.')

	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		"""
		returns 0 when delete none, or 1 when delete one
		"""
		directory = find_directory(helper.name)
		key = self.s3_client.gen_key(directory, entity_id)
		return self.s3_client.delete_object(key)

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		return deleted none when delete none, or deleted one when delete one
		"""
		entity = self.find_by_id(entity_id, helper)
		if entity is None:
			# not found, no need to delete
			return None
		else:
			self.delete_by_id(entity_id, helper)
			return entity

	def delete_only(self, deleter: EntityDeleter) -> int:
		"""
		delete only one, if delete none or more than one item, raise exception
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[delete_only] does not support by S3 storage.')

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		"""
		delete only one, if delete none or more than one item, raise exception
		return the one before delete
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[delete_only_and_pull] does not support by S3 storage.')

	def delete(self, deleter: EntityDeleter) -> int:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[delete] does not support by S3 storage.')

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[delete_and_pull] does not support by S3 storage.')

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		directory = find_directory(helper.name)
		key = SimpleStorageService.gen_key(directory, str(entity_id))
		entity = self.s3_client.get_object(key)
		if entity is None:
			return None
		else:
			return helper.shaper.deserialize(entity)

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[find_and_lock_by_id] does not support by S3 storage.')

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[find_one] does not support by S3 storage.')

	def find(self, finder: EntityFinder) -> EntityList:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[find] does not support by S3 storage.')

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		"""
		filled values with given distinct columns, returns an entity list.
		entity is deserialized by shaper
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[find_distinct_values] does not support by S3 storage.')

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		"""
		fill values with given straight columns, returns an entity list
		entity will not be deserialized by shaper.
		And when there is aggregated columns, other columns will be used in group by
		"""
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[find_straight_values] does not support by S3 storage.')

	def find_all(self, helper: EntityHelper) -> EntityList:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[find_all] does not support by S3 storage.')

	def page(self, pager: EntityPager) -> DataPage:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[page] does not support by S3 storage.')

	def exists(self, finder: EntityFinder) -> bool:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[exists] does not support by S3 storage.')

	def count(self, finder: EntityFinder) -> int:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[count] does not support by S3 storage.')


# noinspection DuplicatedCode
class TopicDataStorageS3(StorageS3, TopicDataStorageSPI):
	def register_topic(self, topic: Topic) -> None:
		register_directory(topic)

	def create_topic_entity(self, topic: Topic) -> None:
		# create_topic_entity is not required in S3
		pass

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		# update_topic_entity is not required in S3
		pass

	def drop_topic_entity(self, topic: Topic) -> None:
		# drop_topic_entity is not required in S3
		pass

	def truncate(self, helper: EntityHelper) -> None:
		prefix = find_directory(helper.name)
		self.s3_client.delete_multiple_objects(prefix)

	def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[ask_synonym_factors] does not support by S3 storage.')

	# noinspection PyMethodMayBeStatic
	def is_free_find_supported(self) -> bool:
		return False

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[free_find] does not support by S3 storage.')

	def free_page(self, pager: FreePager) -> DataPage:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[free_page] does not support by S3 storage.')

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[free_aggregate_find] does not support by S3 storage.')

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		"""
		not supported by S3
		"""
		raise UnexpectedStorageException('Method[free_aggregate_page] does not support by S3 storage.')
