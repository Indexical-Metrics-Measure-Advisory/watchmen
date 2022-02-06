from abc import abstractmethod
from typing import List, Optional, TypeVar

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantId, UserBasedTuple, UserId
from watchmen_storage import EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, EntityRow, \
	EntityShaper, SnowflakeGenerator, TransactionalStorageSPI
from .storage_service import IdentifiedStorableService

TupleId = TypeVar('TupleId', bound=str)


class UserBasedTupleShaper:
	@staticmethod
	def serialize(user_based_tuple: UserBasedTuple, row: EntityRow) -> EntityRow:
		row['user_id'] = user_based_tuple.userId
		row['tenant_id'] = user_based_tuple.tenantId
		return row

	@staticmethod
	def deserialize(row: EntityRow, user_based_tuple: UserBasedTuple) -> UserBasedTuple:
		user_based_tuple.userId = row.get('user_id')
		user_based_tuple.tenantId = row.get('tenant_id')
		return user_based_tuple


class UserBasedTupleService(IdentifiedStorableService):
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
			idColumnName=self.get_storable_id_column_name()
		)

	def create(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		self.try_to_prepare_auditable_on_create(a_tuple)
		self.storage.insert_one(a_tuple, self.get_entity_helper())
		return a_tuple

	def update(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		self.try_to_prepare_auditable_on_update(a_tuple)
		self.storage.update_one(a_tuple, self.get_entity_id_helper())
		return a_tuple

	def delete(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_id_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=tuple_id),
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
