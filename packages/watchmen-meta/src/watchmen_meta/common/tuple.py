from abc import abstractmethod
from datetime import datetime
from typing import Optional, TypeVar

from watchmen_model.common import Tuple
from watchmen_storage import EntityCriteria, EntityDeleter, EntityHelper, EntityShaper, OptimisticLockException, \
	StorageSPI

TupleId = TypeVar('TupleId', bound=str)


class TupleService:
	storage: StorageSPI

	def __init__(self, storage: StorageSPI):
		self.storage = storage

	@abstractmethod
	def get_entity_name(self) -> str:
		pass

	@abstractmethod
	def get_entity_shaper(self) -> EntityShaper:
		pass

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_deleter(self, criteria: EntityCriteria) -> EntityDeleter:
		return EntityDeleter(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria
		)

	@staticmethod
	def now() -> datetime:
		return datetime.now().replace(tzinfo=None)

	def create(self, a_tuple: Tuple) -> Tuple:
		now = TupleService.now()
		a_tuple.createdAt = now
		a_tuple.lastModifiedAt = now
		a_tuple.version = 1

		self.storage.insert_one(a_tuple, self.get_entity_helper())
		return a_tuple

	def update(self, a_tuple: Tuple) -> Tuple:
		a_tuple.lastModifiedAt = TupleService.now()

		try:
			self.storage.update_one(a_tuple, self.get_entity_helper())
			return a_tuple
		except OptimisticLockException as ole:
			raise ole

	def delete(self, tuple_id: TupleId) -> Optional[Tuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[Tuple]:
		return self.storage.find_by_id(tuple_id, self.get_entity_helper())
