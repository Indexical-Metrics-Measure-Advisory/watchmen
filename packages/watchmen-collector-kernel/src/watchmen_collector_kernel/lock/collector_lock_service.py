from datetime import datetime
from typing import List

from watchmen_collector_kernel.model import CollectorCompetitiveLock
from watchmen_meta.common import ask_meta_storage, EntityService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import CollectorCompetitiveLockId, Storable
from watchmen_storage import ColumnNameLiteral, Entity, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityName, EntityRow, EntityShaper, TransactionalStorageSPI


class CollectorCompetitiveLockShaper(EntityShaper):
	def serialize(self, entity: CollectorCompetitiveLock) -> EntityRow:
		return {
			'lock_id': entity.lockId,
			'resource_id': entity.resourceId,
			'model_name': entity.modelName,
			'object_id': entity.objectId,
			'registered_at': entity.registeredAt,
			'tenant_id': entity.tenantId,
			'status': entity.status
		}

	def deserialize(self, row: EntityRow) -> CollectorCompetitiveLock:
		return CollectorCompetitiveLock(
			lockId=row.get('lock_id'),
			resourceId=row.get('resource_id'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			registeredAt=row.get('registered_at'),
			tenantId=row.get('tenant_id'),
			status=row.get('status')
		)


COLLECTOR_COMPETITIVE_LOCK_TABLE = 'collector_competitive_lock'
COLLECTOR_COMPETITIVE_LOCK_ENTITY_SHAPER = CollectorCompetitiveLockShaper()


class CollectorLockService(EntityService):

	def __init__(self, storage: TransactionalStorageSPI):
		super().__init__(storage)

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_COMPETITIVE_LOCK_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_COMPETITIVE_LOCK_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'lock_id'

	def get_storable_id(self, storable: CollectorCompetitiveLock) -> StorableId:
		return storable.lockId

	def set_storable_id(
			self, storable: CollectorCompetitiveLock, storable_id: CollectorCompetitiveLockId) -> Storable:
		storable.lockId = storable_id
		return storable

	def insert_one(self, lock: CollectorCompetitiveLock):
		try:
			self.storage.connect()
			self.storage.insert_one(lock, self.get_entity_helper())
		finally:
			self.storage.close()

	def delete_by_id(self, lock_id: CollectorCompetitiveLockId):
		try:
			self.storage.connect()
			self.storage.delete_by_id(lock_id, self.get_entity_id_helper())
		finally:
			self.storage.close()

	def update_one(self, one: Entity):
		try:
			self.storage.connect()
			self.storage.update_one(one, self.get_entity_id_helper())
		finally:
			self.storage.close()

	def find_by_dependency(self, model_name: str, object_id: str) -> int:
		try:
			self.storage.connect()
			return self.storage.count(self.get_entity_finder(criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='object_id'), right=object_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=0)
			]))
		finally:
			self.storage.close()

	def find_completed_task(self, query_date: datetime) -> List:
		try:
			self.storage.connect()
			return self.storage.find(self.get_entity_finder(criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='registered_at'),
					operator=EntityCriteriaOperator.LESS_THAN, right=query_date),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=1)
			]))
		finally:
			self.storage.close()


def get_collector_lock_service() -> CollectorLockService:
	return CollectorLockService(ask_meta_storage())
