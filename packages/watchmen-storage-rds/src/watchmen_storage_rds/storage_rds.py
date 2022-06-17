from abc import ABC
from logging import getLogger

from sqlalchemy import Table
from sqlalchemy.engine import Connection, Engine

from watchmen_storage import TransactionalStorageSPI, UnexpectedStorageException
from .table_defs import find_table

logger = getLogger(__name__)


class StorageRDS(TransactionalStorageSPI, ABC):
	"""
	name in update, criteria, sort must be serialized to column name, otherwise behavior cannot be predicated
	"""
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect().execution_options(isolation_level="AUTOCOMMIT")

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
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

	# noinspection PyMethodMayBeStatic
	def find_table(self, name: str) -> Table:
		return find_table(name)
