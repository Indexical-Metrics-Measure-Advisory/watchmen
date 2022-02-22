from typing import List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantId, UserBasedTuple, UserId
from watchmen_storage import EntityCriteriaExpression, EntityRow, \
	SnowflakeGenerator, TooManyEntitiesFoundException, TransactionalStorageSPI
from .storage_service import EntityService, TupleId, TupleNotFoundException


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


# noinspection PyAbstractClass
class UserBasedTupleService(EntityService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator, principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	def create(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		self.try_to_prepare_auditable_on_create(a_tuple)
		self.storage.insert_one(a_tuple, self.get_entity_helper())
		return a_tuple

	def update(self, a_tuple: UserBasedTuple) -> UserBasedTuple:
		self.try_to_prepare_auditable_on_update(a_tuple)
		updated_count = self.storage.update_one(a_tuple, self.get_entity_id_helper())
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return a_tuple

	def delete(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_id_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.find_one(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=tuple_id),
			]
		))

	def find_all_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> List[UserBasedTuple]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			]
		))

	def find_tenant_and_user(self, tuple_id: TupleId) -> Optional[Tuple[TenantId, UserId]]:
		finder = self.get_entity_finder_for_columns(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=tuple_id),
			],
			distinctColumnNames=['tenant_id', 'user_id']
		)
		rows = self.storage.find_distinct_values(finder)
		count = len(rows)
		if count == 0:
			return None
		elif count == 1:
			return rows[0].get('tenant_id'), rows[0].get('user_id')
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def delete_by_id(self, tuple_id: TupleId) -> None:
		self.storage.delete_by_id(tuple_id, self.get_entity_id_helper())
