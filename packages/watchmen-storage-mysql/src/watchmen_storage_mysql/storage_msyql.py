from logging import getLogger
from typing import List, Optional

from sqlalchemy import insert, select, Table, text, update
from sqlalchemy.engine import Connection, Engine

from watchmen_model.common import DataPage
from watchmen_storage import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityList, EntityPager, EntityUpdater, TransactionalStorageSPI, UnexpectedStorageException
from watchmen_utilities import ArrayHelper
from .sort_build import build_sort_for_statement
from .table_defs_mysql import find_table
from .types import SQLAlchemyStatement
from .where_build import build_criteria_for_statement

logger = getLogger(__name__)


class StorageMySQL(TransactionalStorageSPI):
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		# self.connection.autocommit(False)
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

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		table = find_table(helper.name)
		row = helper.shaper.serialize(one)
		# TODO InsertConflictException should be determined
		self.connection.execute(insert(table).values(row))

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> EntityList:
		# TODO insert all, storage
		pass

	def update_one(self, one: Entity, helper: EntityHelper) -> int:
		# TODO update one, storage
		pass

	def update_only(self, updater: EntityUpdater) -> int:
		table = find_table(updater.name)
		statement = update(table).values(updater.update)
		statement = build_criteria_for_statement(table, statement, updater.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		# TODO update only and pull, storage
		pass

	def update(self, updater: EntityUpdater) -> int:
		# TODO update, storage
		pass

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		# TODO update and pull, storage
		pass

	def delete_by_id(self, entity_id: EntityId, helper: EntityHelper) -> int:
		# TODO delete by id, storage
		pass

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityHelper) -> Optional[Entity]:
		# TODO delete by id and pull, storage
		pass

	def delete_only(self, deleter: EntityDeleter) -> int:
		# TODO delete only, storage
		pass

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		# TODO delete only and pull, storage
		pass

	def delete(self, deleter: EntityDeleter) -> int:
		# TODO delete, storage
		pass

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		# TODO delete and pull, storage
		pass

	def find_by_id(self, entity_id: EntityId, helper: EntityHelper) -> Optional[Entity]:
		# TODO find by id, storage
		pass

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		# TODO find one, storage
		pass

	def find_on_statement_by_finder(
			self, table: Table, statement: SQLAlchemyStatement, finder: EntityFinder
	) -> EntityList:
		statement = build_criteria_for_statement(table, statement, finder.criteria)
		statement = build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).map(finder.shaper.deserialize).to_list()

	def find(self, finder: EntityFinder) -> EntityList:
		table = find_table(finder.name)
		statement = select(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = find_table(finder.name)
		statement = select(*ArrayHelper(finder.distinctColumnNames).map(text).to_list()).select_from(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_all(self, helper: EntityHelper) -> EntityList:
		return self.find(EntityFinder(name=helper.name, shaper=helper.shaper))

	def page(self, pager: EntityPager) -> DataPage:
		# TODO page, storage
		pass
