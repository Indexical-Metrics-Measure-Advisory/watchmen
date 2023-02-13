from datetime import datetime
from typing import List

from watchmen_collector_kernel.model import CompetitiveLock
from watchmen_meta.common import ask_meta_storage, EntityService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import CompetitiveLockId, Storable
from watchmen_storage import ColumnNameLiteral, Entity, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityName, EntityRow, EntityShaper, TransactionalStorageSPI


class CompetitiveLockShaper(EntityShaper):
	def serialize(self, entity: CompetitiveLock) -> EntityRow:
		return {
			'lock_id': entity.lockId,
			'resource_id': entity.resourceId,
			'registered_at': entity.registeredAt,
			'tenant_id': entity.tenantId
		}

	def deserialize(self, row: EntityRow) -> CompetitiveLock:
		return CompetitiveLock(
			lockId=row.get('lock_id'),
			resourceId=row.get('resource_id'),
			registeredAt=row.get('registered_at'),
			tenantId=row.get('tenant_id')
		)


COMPETITIVE_LOCK_TABLE = 'competitive_lock'
COMPETITIVE_LOCK_ENTITY_SHAPER = CompetitiveLockShaper()


class CompetitiveLockService(EntityService):

	def __init__(self, storage: TransactionalStorageSPI):
		super().__init__(storage)

	def get_entity_name(self) -> EntityName:
		return COMPETITIVE_LOCK_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return COMPETITIVE_LOCK_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'lock_id'

	def get_storable_id(self, storable: CompetitiveLock) -> StorableId:
		return storable.lockId

	def set_storable_id(
			self, storable: CompetitiveLock, storable_id: CompetitiveLockId) -> Storable:
		storable.lockId = storable_id
		return storable

	def insert_one(self, lock: CompetitiveLock):
		try:
			self.storage.connect()
			self.storage.insert_one(lock, self.get_entity_helper())
		finally:
			self.storage.close()

	def delete_by_id(self, lock_id: CompetitiveLockId):
		try:
			self.storage.connect()
			self.storage.delete_by_id(lock_id, self.get_entity_id_helper())
		finally:
			self.storage.close()

	def find_overtime_lock(self, query_time: datetime) -> List:
		try:
			self.storage.connect()
			return self.storage.find(self.get_entity_finder(criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='registered_at'),
					operator=EntityCriteriaOperator.LESS_THAN, right=query_time)
			]))
		finally:
			self.storage.close()


def get_competitive_lock_service(storage: TransactionalStorageSPI) -> CompetitiveLockService:
	return CompetitiveLockService(storage)
