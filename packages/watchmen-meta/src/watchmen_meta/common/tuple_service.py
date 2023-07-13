from typing import Optional
from abc import abstractmethod
from watchmen_auth import PrincipalService
from watchmen_model.common import Auditable, OptimisticLock, TenantBasedTuple, Tuple
from watchmen_model.system import Operation, OperationType
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, OptimisticLockException, \
	SnowflakeGenerator, TransactionalStorageSPI
from .settings import ask_default_package_version
from .storage_service import EntityService, TupleId, TupleNotFoundException
from .operation_service import RecordOperationService
from .package_version_service import PackageVersionService


class AuditableShaper:
	@staticmethod
	def serialize(auditable: Auditable, row: EntityRow) -> EntityRow:
		row['created_at'] = auditable.createdAt
		row['created_by'] = auditable.createdBy
		row['last_modified_at'] = auditable.lastModifiedAt
		row['last_modified_by'] = auditable.lastModifiedBy
		return row

	@staticmethod
	def deserialize(row: EntityRow, auditable: Auditable) -> Auditable:
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
		# noinspection PyTypeChecker
		return a_tuple

	@staticmethod
	def deserialize_tenant_based(row: EntityRow, a_tuple: TenantBasedTuple) -> TenantBasedTuple:
		# noinspection PyTypeChecker
		a_tuple: TenantBasedTuple = TupleShaper.deserialize(row, a_tuple)
		a_tuple.tenantId = row.get('tenant_id')
		return a_tuple


# noinspection PyAbstractClass
class TupleService(EntityService):
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
	def should_record_operation(self) -> bool:
		pass

	def get_package_version_service(self) -> PackageVersionService:
		return PackageVersionService(self.storage, self.snowflakeGenerator, self.principalService)

	def get_operation_service(self) -> RecordOperationService:
		return RecordOperationService(self.storage, self.snowflakeGenerator, self.principalService)

	def build_operation(self, operation_type: str, a_tuple: Tuple) -> Operation:
		package_version = self.get_package_version_service().find_by_tenant(self.principalService.get_tenant_id())
		if package_version:
			current_version = package_version.currVersion
		else:
			current_version = ask_default_package_version()

		return Operation(
			recordId=str(self.snowflakeGenerator.next_id()),
			operationType=operation_type,
			tupleKey=self.get_storable_id_column_name(),
			tupleType=self.get_entity_name(),
			tupleId=self.get_storable_id(a_tuple),
			content=self.get_entity_shaper().serialize(a_tuple),
			versionNum=current_version,
			tenantId=self.principalService.tenantId
		)

	def record_operation(self, operation_type: str, a_tuple: Optional[Tuple]):
		if a_tuple and self.should_record_operation():
			self.get_operation_service().record_operation(self.build_operation(operation_type, a_tuple))

	def create(self, a_tuple: Tuple) -> Tuple:
		self.try_to_prepare_auditable_on_create(a_tuple)
		if isinstance(a_tuple, OptimisticLock):
			a_tuple.version = 1
		self.storage.insert_one(a_tuple, self.get_entity_helper())
		self.record_operation(OperationType.CREATE, a_tuple)
		return a_tuple

	def update(self, a_tuple: Tuple) -> Tuple:
		"""
		with optimistic lock logic
		"""
		original_last_modified_at, original_last_modified_by = self.try_to_prepare_auditable_on_update(a_tuple)
		is_optimistic_lock, version = self.try_to_prepare_optimistic_lock_on_update(a_tuple)
		if is_optimistic_lock:
			# noinspection PyTypeChecker
			updated_count = self.storage.update_only(self.get_entity_updater(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()),
						right=self.get_storable_id(a_tuple)),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=self.get_optimistic_column_name()), right=version)
				],
				# to avoid update created columns in update
				update=self.try_to_ignore_created_columns(
					self.ignore_storable_id(self.get_entity_shaper().serialize(a_tuple)))
			))
			if updated_count == 0:
				a_tuple.version = version
				self.try_to_recover_auditable_on_update(a_tuple, original_last_modified_at, original_last_modified_by)
				raise OptimisticLockException('Update 0 row might be caused by optimistic lock.')
		else:
			updated_count = self.storage.update_only(self.get_entity_updater(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()),
						right=self.get_storable_id(a_tuple))
				],
				# to avoid update created columns in update
				update=self.try_to_ignore_created_columns(
					self.ignore_optimistic_keys(self.get_entity_shaper().serialize(a_tuple)))
			))
			if updated_count == 0:
				self.try_to_recover_auditable_on_update(a_tuple, original_last_modified_at, original_last_modified_by)
				raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		self.record_operation(OperationType.UPDATE, a_tuple)
		return a_tuple

	def delete(self, tuple_id: TupleId) -> Optional[Tuple]:
		a_tuple = self.storage.delete_by_id_and_pull(tuple_id, self.get_entity_id_helper())
		self.record_operation(OperationType.DELETE, a_tuple)
		return a_tuple

	def find_by_id(self, tuple_id: TupleId) -> Optional[Tuple]:

		return self.storage.find_by_id(tuple_id, self.get_entity_id_helper())
