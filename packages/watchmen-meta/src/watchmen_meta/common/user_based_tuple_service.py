from typing import List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.common import Auditable, OptimisticLock, TenantId, UserBasedTuple, UserId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, SnowflakeGenerator, \
	TooManyEntitiesFoundException, TransactionalStorageSPI
from .storage_service import EntityService, TupleId, TupleNotFoundException
from .tuple_service import AuditableShaper, OptimisticLockShaper


class UserBasedTupleShaper:
	@staticmethod
	def serialize(user_based_tuple: UserBasedTuple, row: EntityRow) -> EntityRow:
		row['user_id'] = user_based_tuple.userId
		row['tenant_id'] = user_based_tuple.tenantId
		if isinstance(user_based_tuple, Auditable):
			row = AuditableShaper.serialize(user_based_tuple, row)
		if isinstance(user_based_tuple, OptimisticLock):
			row = OptimisticLockShaper.serialize(user_based_tuple, row)
		return row

	@staticmethod
	def deserialize(row: EntityRow, user_based_tuple: UserBasedTuple) -> UserBasedTuple:
		user_based_tuple.userId = row.get('user_id')
		user_based_tuple.tenantId = row.get('tenant_id')
		if isinstance(user_based_tuple, Auditable):
			user_based_tuple = AuditableShaper.deserialize(row, user_based_tuple)
		if isinstance(user_based_tuple, OptimisticLock):
			user_based_tuple = OptimisticLockShaper.deserialize(row, user_based_tuple)
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
		original_last_modified_at, original_last_modified_by = self.try_to_prepare_auditable_on_update(a_tuple)
		if isinstance(a_tuple, Auditable):
			updated_count = self.storage.update_only(self.get_entity_updater(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()),
						right=self.get_storable_id(a_tuple))
				],
				# to avoid update created columns in update
				update=self.try_to_ignore_created_columns(
					self.ignore_storable_id(self.get_entity_shaper().serialize(a_tuple)))
			))
		else:
			updated_count = self.storage.update_one(a_tuple, self.get_entity_id_helper())
		if updated_count == 0:
			self.try_to_recover_auditable_on_update(a_tuple, original_last_modified_at, original_last_modified_by)
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return a_tuple

	def delete(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_id_helper())

	def find_by_id(self, tuple_id: TupleId) -> Optional[UserBasedTuple]:
		return self.storage.find_one(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=tuple_id),
			]
		))

	def find_all_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> List[UserBasedTuple]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def find_tenant_and_user(self, tuple_id: TupleId) -> Optional[Tuple[TenantId, UserId]]:
		finder = self.get_entity_finder_for_columns(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=tuple_id),
			],
			distinctColumnNames=['tenant_id', 'user_id']
		)
		# noinspection PyTypeChecker
		rows: List[UserBasedTuple] = self.storage.find_distinct_values(finder)
		count = len(rows)
		if count == 0:
			return None
		elif count == 1:
			return rows[0].tenantId, rows[0].userId
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def delete_by_id(self, tuple_id: TupleId) -> None:
		self.storage.delete_by_id(tuple_id, self.get_entity_id_helper())
