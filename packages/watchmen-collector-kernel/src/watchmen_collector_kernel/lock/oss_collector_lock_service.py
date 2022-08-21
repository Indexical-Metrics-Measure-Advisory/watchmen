from watchmen_meta.common import EntityService, ask_meta_storage
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, OssCollectorCompetitiveLockId
from watchmen_storage import EntityShaper, EntityRow, EntityName, TransactionalStorageSPI, \
	EntityHelper, EntityIdHelper, EntityFinder, ColumnNameLiteral, EntityCriteriaExpression, EntityList
from watchmen_collector_kernel.model import OSSCollectorCompetitiveLock


class OSSCollectorCompetitiveLockShaper(EntityShaper):
	def serialize(self, entity: OSSCollectorCompetitiveLock) -> EntityRow:
		return {
			'lock_id': entity.lockId,
			'resource_id': entity.resourceId,
			'model_name': entity.modelName,
			'object_id': entity.objectId,
			'registered_at': entity.registeredAt
		}
	
	def deserialize(self, row: EntityRow) -> OSSCollectorCompetitiveLock:
		return OSSCollectorCompetitiveLock(
			lockId=row.get('lock_id'),
			resourceId=row.get('resource_id'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			registeredAt=row.get('registered_at')
		)


OSS_COLLECTOR_COMPETITIVE_LOCK_TABLE = 'oss_collector_competitive_lock'
OSS_COLLECTOR_COMPETITIVE_LOCK_ENTITY_SHAPER = OSSCollectorCompetitiveLockShaper()


class OssCollectorLockService(EntityService):
	
	def __init__(self, storage: TransactionalStorageSPI):
		super().__init__(storage)
		
	def get_entity_name(self) -> EntityName:
		return OSS_COLLECTOR_COMPETITIVE_LOCK_TABLE
	
	def get_entity_shaper(self) -> EntityShaper:
		return OSS_COLLECTOR_COMPETITIVE_LOCK_ENTITY_SHAPER
	
	def get_storable_id_column_name(self) -> EntityName:
		return 'lock_id'
	
	def get_storable_id(self, storable: OSSCollectorCompetitiveLock) -> StorableId:
		return storable.lockId
	
	def set_storable_id(self, storable: OSSCollectorCompetitiveLock, storable_id: OssCollectorCompetitiveLockId) -> Storable:
		storable.lockId = storable_id
		return storable
	
	def insert_one(self, lock: OSSCollectorCompetitiveLock):
		self.storage.connect()
		self.storage.insert_one(
			lock,
			EntityHelper(name=OSS_COLLECTOR_COMPETITIVE_LOCK_TABLE, shaper=OSS_COLLECTOR_COMPETITIVE_LOCK_ENTITY_SHAPER)
		)
	
	def delete_by_id(self, id_: OssCollectorCompetitiveLockId):
		self.storage.delete_by_id(id_,
		                          EntityIdHelper(idColumnName='lock_id',
		                                         name=OSS_COLLECTOR_COMPETITIVE_LOCK_TABLE,
		                                         shaper=OSS_COLLECTOR_COMPETITIVE_LOCK_ENTITY_SHAPER)
		                          )

	def find_by_dependency(self, model_name: str, object_id: str) -> EntityList:
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='object_id'), right=object_id)
			]
		))


def get_oss_collector_lock_service() -> OssCollectorLockService:
	return OssCollectorLockService(ask_meta_storage())
