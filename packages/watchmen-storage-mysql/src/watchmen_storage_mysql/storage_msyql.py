from logging import getLogger
from typing import List

from funct import Array
from sqlalchemy import insert, select, text, update
from sqlalchemy.engine import Connection, Engine

from watchmen_model.common import DataPage
from watchmen_storage import TransactionalStorageSPI, UnexpectedStorageException
from watchmen_storage.storage_types import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, \
	EntityHelper, EntityId, EntityList, EntityPager, EntityUpdater
from watchmen_storage_mysql.mysql_table_defs import find_table
from watchmen_storage_mysql.sort_build import build_sort_for_statement
from watchmen_storage_mysql.where_build import build_criteria_for_statement

logger = getLogger(__name__)


class StorageMySQL(TransactionalStorageSPI):
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		self.connection.autocommit(False)
		self.connection.begin()

	def commit_and_close(self) -> None:
		try:
			self.connection.commit()
		except Exception as e:
			raise e
		else:
			self.close()

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

	def insert_one(self, one: Entity, helper: EntityHelper) -> Entity:
		table = find_table(helper.name)
		row = helper.shaper.serialize(one)
		self.connection.execute(insert(table).values(row))
		# return original entity directly
		return one

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> EntityList:
		pass

	def update_one(self, one: Entity, helper: EntityHelper) -> int:
		pass

	def update_only(self, updater: EntityUpdater) -> int:
		table = find_table(updater.name)
		statement = update(table).values(updater.update)
		build_criteria_for_statement(statement, updater.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

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
		table = find_table(finder.name)
		statement = select(table)
		build_criteria_for_statement(statement, finder.criteria)
		build_sort_for_statement(statement, finder.sort)

		results = self.connection.execute(statement).mappings().all()
		return list(Array(results).map(finder.shaper.deserialize))

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = find_table(finder.name)
		statement = select(*Array(finder.distinctColumnNames).map(text)).select_from(table)
		build_criteria_for_statement(statement, finder.criteria)
		build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return list(Array(results).map(finder.shaper.deserialize))

	def find_all(self, helper: EntityHelper) -> EntityList:
		pass

	def page(self, pager: EntityPager) -> DataPage:
		pass
