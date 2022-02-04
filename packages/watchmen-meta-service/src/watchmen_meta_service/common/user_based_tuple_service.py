from abc import abstractmethod
from typing import List, Optional, TypeVar

from watchmen_auth import PrincipalService
from watchmen_meta_service.common import StorageService
from watchmen_model.common import TenantId, UserBasedTuple, UserId
from watchmen_storage import EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, EntityShaper, \
	SnowflakeGenerator, TransactionalStorageSPI

TupleId = TypeVar('TupleId', bound=str)


class UserBasedTupleService(StorageService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService,

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
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			idColumnName=self.get_tuple_id_column_name()
		)

	@abstractmethod
	def get_tuple_id_column_name(self) -> str:
		pass

	@abstractmethod
	def get_tuple_id(self, a_tuple: UserBasedTuple) -> TupleId:
		pass

	@abstractmethod
	def set_tuple_id(self, a_tuple: UserBasedTuple, tuple_id: TupleId) -> UserBasedTuple:
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

	def redress_tuple_id(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		"""
		return exactly the given tuple, replace by generated id if it is faked
		"""
		if UserBasedTupleService.is_tuple_id_faked(self.get_tuple_id(a_tuple)):
			self.set_tuple_id(a_tuple, self.generate_tuple_id())
		return a_tuple

	def create(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		self.storage.insert_one(a_tuple, self.get_entity_helper())
		return a_tuple

	def update(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		self.storage.update_one(a_tuple, self.get_entity_id_helper())
		return a_tuple

	def delete(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_id_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name=self.get_tuple_id_column_name(), value=tuple_id),
			]
		))

	def find_all_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> List[UserBasedTuple]:
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			]
		))

	def delete_by_id(self, tuple_id: TupleId) -> None:
		self.storage.delete_by_id(tuple_id, self.get_entity_id_helper())
