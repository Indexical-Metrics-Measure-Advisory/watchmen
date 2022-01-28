from abc import abstractmethod
from datetime import datetime
from typing import Optional, TypeVar

from watchmen_model.common import Auditable, OptimisticLock, Tuple
from watchmen_storage import EntityCriteria, EntityDeleter, EntityHelper, EntityRow, EntityShaper, \
	OptimisticLockException, StorageSPI

TupleId = TypeVar('TupleId', bound=str)


class AuditableShaper:
	@staticmethod
	def serialize(auditable: Auditable, row: EntityRow) -> EntityRow:
		row['created_at'] = auditable.createdAt
		row['created_by'] = auditable.createdBy
		row['last_modified_at'] = auditable.lastModifiedAt
		row['last_modified_by'] = auditable.lastModifiedBy
		return row

	@staticmethod
	def deserialize(row: EntityRow, auditable: Tuple) -> Tuple:
		auditable.createdAt = row.get('created_at')
		auditable.createdBy = row.get('created_by')
		auditable.lastModifiedAt = row.get('last_modified_at')
		auditable.lastModifiedBy = row.get('last_modified_by')
		return auditable


class OptimisticLockShaper:
	@staticmethod
	def serialize(lock: OptimisticLock, row: EntityRow) -> EntityRow:
		row['version'] = lock.version
		return row

	@staticmethod
	def deserialize(row: EntityRow, lock: Tuple) -> Tuple:
		lock.version = row.get('version')
		return lock


class TupleShaper:
	@staticmethod
	def serialize(a_tuple: Tuple, row: EntityRow) -> EntityRow:
		row = AuditableShaper.serialize(a_tuple, row)
		row = OptimisticLockShaper.serialize(a_tuple, row)
		return row

	@staticmethod
	def deserialize(row: EntityRow, a_tuple: Tuple) -> Tuple:
		a_tuple = AuditableShaper.deserialize(row, a_tuple)
		a_tuple = OptimisticLockShaper.deserialize(row, a_tuple)
		return a_tuple


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

	@abstractmethod
	def get_tuple_id(self, a_tuple: Tuple) -> TupleId:
		pass

	@abstractmethod
	def set_tuple_id(self, a_tuple: Tuple, tuple_id: TupleId) -> Tuple:
		"""
		return exactly the given tuple
		"""
		pass

	@staticmethod
	def is_tuple_id_faked(tuple_id: TupleId) -> bool:
		if tuple_id is None:
			return True

		trimmed_tuple_id = tuple_id.strip()
		if len(trimmed_tuple_id) == 0:
			return True
		elif trimmed_tuple_id.startswith('f-'):
			return True
		else:
			return False

	def generate_tuple_id(self) -> TupleId:
		# TODO
		pass

	def redress_tuple_id(self, a_tuple: Tuple) -> Tuple:
		"""
		return exactly the given tuple, replace by generated id if it is faked
		"""
		if TupleService.is_tuple_id_faked(self.get_tuple_id(a_tuple)):
			self.set_tuple_id(a_tuple, self.generate_tuple_id())
		return a_tuple

	def create(self, a_tuple: Tuple) -> Tuple:
		now = TupleService.now()
		a_tuple.createdAt = now
		# TODO created by
		a_tuple.lastModifiedAt = now
		# TODO last modified by
		a_tuple.version = 1

		self.storage.insert_one(a_tuple, self.get_entity_helper())
		return a_tuple

	def update(self, a_tuple: Tuple) -> Tuple:
		a_tuple.lastModifiedAt = TupleService.now()
		# TODO last modified by

		try:
			self.storage.update_one(a_tuple, self.get_entity_helper())
			return a_tuple
		except OptimisticLockException as ole:
			raise ole

	def delete(self, tuple_id: TupleId) -> Optional[Tuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[Tuple]:
		return self.storage.find_by_id(tuple_id, self.get_entity_helper())
