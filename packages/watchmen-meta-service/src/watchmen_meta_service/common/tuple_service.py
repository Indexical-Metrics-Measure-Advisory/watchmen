from abc import abstractmethod
from datetime import datetime
from typing import Optional, TypeVar

from watchmen_auth import PrincipalService
from watchmen_model.common import Auditable, OptimisticLock, Pageable, TenantBasedTuple, Tuple
from watchmen_storage import EntityCriteria, EntityCriteriaExpression, EntityDeleter, EntityFinder, EntityHelper, \
	EntityIdHelper, EntityPager, EntityRow, EntityShaper, EntitySort, EntityUpdate, EntityUpdater, \
	OptimisticLockException, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_seconds
from .storage_service import StorageService

TupleId = TypeVar('TupleId', bound=str)


class TupleNotFoundException(Exception):
	pass


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
	def deserialize(row: EntityRow, lock: OptimisticLock) -> OptimisticLock:
		lock.version = row.get('version')
		return lock


class TupleShaper:
	@staticmethod
	def serialize(a_tuple: Tuple, row: EntityRow) -> EntityRow:
		row = AuditableShaper.serialize(a_tuple, row)
		if isinstance(a_tuple, OptimisticLock):
			row = OptimisticLockShaper.serialize(a_tuple, row)
		return row

	@staticmethod
	def serialize_tenant_based(a_tuple: TenantBasedTuple, row: EntityRow) -> EntityRow:
		row = TupleShaper.serialize(a_tuple, row)
		row['tenant_id'] = a_tuple.tenantId
		return row

	@staticmethod
	def deserialize(row: EntityRow, a_tuple: Tuple) -> Tuple:
		a_tuple = AuditableShaper.deserialize(row, a_tuple)
		if isinstance(a_tuple, OptimisticLock):
			a_tuple = OptimisticLockShaper.deserialize(row, a_tuple)
		return a_tuple

	@staticmethod
	def deserialize_tenant_based(row: EntityRow, a_tuple: TenantBasedTuple) -> TenantBasedTuple:
		# noinspection PyTypeChecker
		a_tuple: TenantBasedTuple = TupleShaper.deserialize(row, a_tuple)
		a_tuple.tenantId = row.get('tenant_id')
		return a_tuple


class TupleService(StorageService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	@abstractmethod
	def get_entity_name(self) -> str:
		pass

	@abstractmethod
	def get_entity_shaper(self) -> EntityShaper:
		pass

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(), idColumnName=self.get_tuple_id_column_name())

	def get_entity_finder(self, criteria: EntityCriteria, sort: Optional[EntitySort] = None) -> EntityFinder:
		return EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			sort=sort
		)

	def get_entity_pager(
			self, criteria: EntityCriteria, pageable: Pageable, sort: Optional[EntitySort] = None
	) -> EntityPager:
		return EntityPager(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			sort=sort,
			pageable=pageable
		)

	def get_entity_updater(self, criteria: EntityCriteria, update: EntityUpdate) -> EntityUpdater:
		return EntityUpdater(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			update=update
		)

	def get_entity_deleter(self, criteria: EntityCriteria) -> EntityDeleter:
		return EntityDeleter(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria
		)

	@staticmethod
	def now() -> datetime:
		return get_current_time_seconds()

	@abstractmethod
	def get_tuple_id_column_name(self) -> str:
		pass

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
		return str(self.snowflake_generator.next_id())

	def redress_tuple_id(self, a_tuple: Tuple) -> Tuple:
		"""
		return exactly the given tuple, replace by generated id if it is faked
		"""
		if TupleService.is_tuple_id_faked(self.get_tuple_id(a_tuple)):
			self.set_tuple_id(a_tuple, self.generate_tuple_id())
		return a_tuple

	@staticmethod
	def get_optimistic_column_name():
		return 'version'

	def ignore_optimistic_keys(self, data: EntityRow) -> EntityRow:
		del data[TupleService.get_optimistic_column_name()]
		del data[self.get_tuple_id_column_name()]

		return data

	def create(self, a_tuple: Tuple) -> Tuple:
		now = TupleService.now()
		a_tuple.createdAt = now
		a_tuple.createdBy = self.principal_service.get_user_id()
		a_tuple.lastModifiedAt = now
		a_tuple.lastModifiedBy = self.principal_service.get_user_id()
		if isinstance(a_tuple, OptimisticLock):
			a_tuple.version = 1

		self.storage.insert_one(a_tuple, self.get_entity_helper())
		return a_tuple

	def update(self, a_tuple: Tuple) -> Tuple:
		a_tuple.lastModifiedAt = TupleService.now()
		a_tuple.lastModifiedBy = self.principal_service.get_user_id()

		if isinstance(a_tuple, OptimisticLock):
			version = a_tuple.version
			a_tuple.version = version + 1
			# noinspection PyTypeChecker
			updated_count = self.storage.update_only(self.get_entity_updater(
				criteria=[
					EntityCriteriaExpression(name=self.get_tuple_id_column_name(), value=self.get_tuple_id(a_tuple)),
					EntityCriteriaExpression(name=TupleService.get_optimistic_column_name(), value=version)
				],
				update=self.get_entity_shaper().serialize(a_tuple)
			))
			if updated_count == 0:
				a_tuple.version = version
				raise OptimisticLockException('Update 0 row might be caused by optimistic lock.')
		else:
			updated_count = self.storage.update_one(a_tuple, self.get_entity_id_helper())
			if updated_count == 0:
				raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return a_tuple

	def delete(self, tuple_id: TupleId) -> Optional[Tuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_id_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[Tuple]:
		return self.storage.find_by_id(tuple_id, self.get_entity_id_helper())
