from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional, Tuple, TypeVar

from watchmen_auth import PrincipalService
from watchmen_model.common import Auditable, OptimisticLock, Pageable, Storable, UserId
from watchmen_storage import EntityColumnName, EntityCriteria, EntityDeleter, EntityDistinctValuesFinder, \
	EntityFinder, EntityHelper, EntityIdHelper, EntityName, EntityPager, EntityRow, EntityShaper, EntitySort, \
	EntityUpdate, EntityUpdater, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds

StorableId = TypeVar('StorableId', bound=str)
TupleId = TypeVar('TupleId', bound=str)


class TupleNotFoundException(Exception):
	pass


class StorageService(ABC):
	storage: TransactionalStorageSPI
	principalService: Optional[PrincipalService] = None
	snowflakeGenerator: Optional[SnowflakeGenerator] = None

	def __init__(self, storage: TransactionalStorageSPI):
		self.storage = storage

	def with_principal_service(self, principal_service: PrincipalService) -> StorageService:
		self.principalService = principal_service
		return self

	def with_snowflake_generator(self, snowflake_generator: SnowflakeGenerator) -> StorageService:
		self.snowflakeGenerator = snowflake_generator
		return self

	def begin_transaction(self):
		self.storage.begin()

	def commit_transaction(self):
		self.storage.commit_and_close()

	def rollback_transaction(self):
		self.storage.rollback_and_close()

	def close_transaction(self):
		self.storage.close()

	# noinspection PyMethodMayBeStatic
	def now(self) -> datetime:
		"""
		get current time in seconds
		"""
		return get_current_time_in_seconds()

	def try_to_prepare_auditable_on_create(self, storable: Storable) -> None:
		"""
		set 4 audit columns when given storable is an auditable
		"""
		if isinstance(storable, Auditable):
			now = self.now()
			storable.createdAt = now
			storable.createdBy = self.principalService.get_user_id()
			storable.lastModifiedAt = now
			storable.lastModifiedBy = self.principalService.get_user_id()

	# noinspection PyMethodMayBeStatic
	def try_to_prepare_optimistic_lock_on_create(self, storable: Storable) -> None:
		"""
		set version to 1 if given storable is an optimistic lock
		"""
		if isinstance(storable, OptimisticLock):
			storable.version = 1

	def try_to_prepare_auditable_on_update(self, storable: Storable) -> Tuple[Optional[datetime], Optional[UserId]]:
		"""
		set last modified columns when given storable is an auditable
		"""
		if isinstance(storable, Auditable):
			last_modified_at = storable.lastModifiedAt
			last_modified_by = storable.lastModifiedBy
			storable.lastModifiedAt = self.now()
			storable.lastModifiedBy = self.principalService.get_user_id()
			return last_modified_at, last_modified_by
		else:
			return None, None

	# noinspection PyMethodMayBeStatic
	def try_to_recover_auditable_on_update(
			self, storable: Storable, last_modified_at: Optional[datetime], last_modified_by: Optional[UserId]
	) -> None:
		if isinstance(storable, Auditable):
			storable.lastModifiedAt = last_modified_at
			storable.lastModifiedBy = last_modified_by

	# noinspection PyMethodMayBeStatic
	def try_to_prepare_optimistic_lock_on_update(self, storable: Storable) -> Tuple[bool, int]:
		"""
		return (true, original version) when given storable is an optimistic lock, and assign new version to given storable
		return (false, 0) when given storable is not an optimistic lock
		"""
		if isinstance(storable, OptimisticLock):
			version = storable.version
			storable.version = version + 1
			return True, version
		else:
			return False, 0

	# noinspection PyMethodMayBeStatic
	def try_to_ignore_created_columns(self, data: EntityRow) -> EntityRow:
		if 'created_at' in data:
			del data['created_at']
		if 'created_by' in data:
			del data['created_by']

		return data


class IdentifiedStorableService(StorageService):
	@abstractmethod
	def get_storable_id_column_name(self) -> EntityName:
		pass

	@abstractmethod
	def get_storable_id(self, storable: Storable) -> StorableId:
		pass

	@abstractmethod
	def set_storable_id(self, storable: Storable, storable_id: StorableId) -> Storable:
		"""
		return exactly the given storable
		"""
		pass

	@staticmethod
	def is_storable_id_faked(storable_id: StorableId) -> bool:
		if storable_id is None:
			return True

		trimmed_storable_id = storable_id.strip()
		if len(trimmed_storable_id) == 0:
			return True
		elif trimmed_storable_id.startswith('f-'):
			return True
		else:
			return False

	def generate_storable_id(self) -> StorableId:
		return str(self.snowflakeGenerator.next_id())

	def redress_storable_id(self, storable: Storable) -> Storable:
		"""
		return exactly the given tuple, replace by generated id if it is faked
		"""
		if IdentifiedStorableService.is_storable_id_faked(self.get_storable_id(storable)):
			self.set_storable_id(storable, self.generate_storable_id())
		return storable

	# noinspection PyMethodMayBeStatic
	def get_optimistic_column_name(self) -> str:
		return 'version'

	def ignore_optimistic_keys(self, data: EntityRow) -> EntityRow:
		if self.get_optimistic_column_name() in data:
			del data[self.get_optimistic_column_name()]
		if self.get_storable_id_column_name() in data:
			del data[self.get_storable_id_column_name()]

		return data

	def ignore_storable_id(self, data: EntityRow) -> EntityRow:
		if self.get_storable_id_column_name() in data:
			del data[self.get_storable_id_column_name()]
		return data


class EntityService(IdentifiedStorableService):
	@abstractmethod
	def get_entity_name(self) -> EntityName:
		pass

	@abstractmethod
	def get_entity_shaper(self) -> EntityShaper:
		pass

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(),
			idColumnName=self.get_storable_id_column_name())

	def get_entity_finder(self, criteria: EntityCriteria, sort: Optional[EntitySort] = None) -> EntityFinder:
		return EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			sort=sort
		)

	def get_entity_finder_for_columns(
			self, criteria: EntityCriteria,
			distinctColumnNames: List[EntityColumnName],
			distinctValueOnSingleColumn: Optional[bool] = False,
			sort: Optional[EntitySort] = None
	) -> EntityDistinctValuesFinder:
		return EntityDistinctValuesFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			sort=sort,
			distinctColumnNames=distinctColumnNames,
			distinctValueOnSingleColumn=distinctValueOnSingleColumn
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
