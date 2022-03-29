from logging import getLogger
from typing import Any, Dict, List, Optional

from watchmen_model.admin import Topic
from watchmen_model.common import DataPage
from watchmen_storage import as_table_name, Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, \
	EntityHelper, EntityId, EntityIdHelper, EntityList, EntityPager, EntityStraightValuesFinder, EntityUpdater, \
	FreeAggregatePager, FreeAggregator, FreeFinder, FreePager, TopicDataStorageSPI, TransactionalStorageSPI, \
	UnexpectedStorageException
from watchmen_utilities import ArrayHelper
from .document_defs_mongo import find_document, register_document
from .document_mongo import MongoDocument
from .engine_mongo import MongoConnection, MongoEngine

# noinspection DuplicatedCode
logger = getLogger(__name__)


class StorageMongoDB(TransactionalStorageSPI):
	"""
	name in update, criteria, sort must be serialized to column name, otherwise behavior cannot be predicated
	"""
	connection: MongoConnection = None

	def __init__(self, engine: MongoEngine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect()

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		self.connection.begin()

	def commit_and_close(self) -> None:
		pass

	def rollback_and_close(self) -> None:
		try:
			self.connection.rollback()
		except Exception as e:
			logger.warning('Exception raised on rollback.', e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def close(self) -> None:
		try:
			if self.connection is not None:
				self.connection.close()
				del self.connection
		except Exception as e:
			logger.warning('Exception raised on close connection.', e)

	# noinspection PyMethodMayBeStatic
	def find_document(self, name: str) -> MongoDocument:
		return find_document(name)

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		document = self.find_document(helper.name)
		row = helper.shaper.serialize(one)
		document.try_to_copy_id_column(row)
		self.connection.insert_one(document, row)

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		document = self.find_document(helper.name)
		rows = ArrayHelper(data) \
			.map(lambda x: helper.shaper.serialize(x)) \
			.map(lambda x: document.try_to_copy_id_column(x)) \
			.to_list()
		self.connection.insert_many(document, rows)

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		pass

	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		pass

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		pass

	def update(self, updater: EntityUpdater) -> int:
		pass

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		pass

	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		document = self.find_document(helper.name)
		return self.connection.delete_by_id(document, entity_id).deleted_count

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	def delete_only(self, deleter: EntityDeleter) -> int:
		pass

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		pass

	def delete(self, deleter: EntityDeleter) -> int:
		pass

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		pass

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		document = self.find_document(helper.name)
		return self.connection.find_by_id(document, entity_id)

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		pass

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		pass

	def find(self, finder: EntityFinder) -> EntityList:
		pass

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		pass

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		pass

	def find_all(self, helper: EntityHelper) -> EntityList:
		pass

	def page(self, pager: EntityPager) -> DataPage:
		pass

	def exists(self, finder: EntityFinder) -> bool:
		pass

	def count(self, finder: EntityFinder) -> int:
		pass


class TopicDataStorageMongoDB(StorageMongoDB, TopicDataStorageSPI):
	def register_topic(self, topic: Topic) -> None:
		register_document(topic)

	def create_topic_entity(self, topic: Topic) -> None:
		# create collection is unnecessary
		pass

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		# update collection is unnecessary
		pass

	def drop_topic_entity(self, topic_name: str) -> None:
		entity_name = as_table_name(topic_name)
		try:
			self.connect()
			self.connection.drop_collection(entity_name)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def truncate(self, helper: EntityHelper) -> None:
		"""
		in mongo, use drop instead of truncate, more efficient
		"""
		document = self.find_document(helper.name)
		self.connection.drop_collection(document.name)

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		pass

	def free_page(self, pager: FreePager) -> DataPage:
		pass

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass
