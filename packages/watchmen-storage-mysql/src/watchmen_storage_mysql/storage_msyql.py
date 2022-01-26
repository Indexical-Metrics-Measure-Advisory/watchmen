from logging import getLogger
from typing import Callable, List

from pymysql import Connection
from sqlalchemy.engine import Engine

from watchmen_model.common import DataPage
from watchmen_storage import TransactionalStorageSPI
from watchmen_storage.storage_types import Entity, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, \
	EntityHelper, EntityId, EntityList, EntityPager, EntityUpdater

logger = getLogger(__name__)


class StorageMySQL(TransactionalStorageSPI):
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def begin(self) -> None:
		self.connection = self.engine.connect()
		self.connection.begin()

	def quiet_close(self, do: Callable[[], None], catch: Callable[[], None] = None) -> None:
		try:
			do()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			if catch is not None:
				catch()
		finally:
			try:
				if self.connection is not None:
					self.connection.close()
					del self.connection
			except Exception as e:
				logger.warning('Exception raised on close connection.', e)

	def commit_and_close(self) -> None:
		"""
		1. commit successfully -> close
		2. commit failed -> rollback successfully -> close
		3. commit failed -> rollback failed -> close
		"""

		def on_commit_failed() -> None:
			try:
				self.connection.rollback()
			except Exception as e:
				logger.warning('Exception raised on rollback connection, ignored.', e)

		self.quiet_close(self.connection.commit, on_commit_failed)

	def do_rollback(self) -> None:
		self.connection.rollback()

	def rollback_and_close(self) -> None:
		"""
		1. rollback successfully -> close
		2. rollback failed -> close
		"""
		self.quiet_close(self.do_rollback)

	# table = self.table.get_table_by_name(name)
	# one_dict: dict = convert_to_dict(one)
	# values = {}
	# for key, value in one_dict.items():
	# 	if isinstance(table.c[key.lower()].type, JSON):
	# 		if value is not None:
	# 			values[key.lower()] = value
	# 		else:
	# 			values[key.lower()] = None
	# 	else:
	# 		values[key.lower()] = value
	# stmt = insert(table).values(values)
	# with self.engine.connect() as conn:
	# 	with conn.begin():
	# 		conn.execute(stmt)
	# return model.parse_obj(one)
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
