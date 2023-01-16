
from datetime import datetime
from typing import List

from watchmen_collector_kernel.model import CollectorChangeRecord
from watchmen_collector_kernel.model import CollectorChangeRecord
from watchmen_meta.common import ask_meta_storage, EntityService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import CollectorCompetitiveLockId, Storable, CollectorTaskId, CollectorIntegratedRecordId, \
	CollectorChangeRecordId
from watchmen_storage import ColumnNameLiteral, Entity, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityName, EntityRow, EntityShaper, TransactionalStorageSPI


class CollectorChangeRecordsShaper(EntityShaper):
	def serialize(self, entity: CollectorChangeRecord) -> EntityRow:
		return {
			'change_record_id': entity.recordId,
			'model_name': entity.modelName,
			'table_name': entity.tableName,
			'unique_key_value': entity.uniqueKeyValue
		}

	def deserialize(self, row: EntityRow) -> CollectorChangeRecord:
		return CollectorChangeRecord(
			recordId=row.get('change_record_id'),
			modelName=row.get('model_name'),
			tableName=row.get('table_name'),
			uniqueKeyValue=row.get('unique_key_value')
		)


COLLECTOR_CHANGE_RECORDS_TABLE = 'collector_change_records'
COLLECTOR_CHANGE_RECORDS_ENTITY_SHAPER = CollectorChangeRecordsShaper()


class CollectorChangeRecordsService(EntityService):

	def __init__(self, storage: TransactionalStorageSPI):
		super().__init__(storage)

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_CHANGE_RECORDS_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_CHANGE_RECORDS_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'record_id'

	def get_storable_id(self, storable: CollectorChangeRecord) -> StorableId:
		return storable.recordId

	def set_storable_id(
			self, storable: CollectorChangeRecord, storable_id: CollectorChangeRecordId) -> Storable:
		storable.integrationId = storable_id
		return storable

	def insert_one(self, change_record: CollectorChangeRecord):
		try:
			self.storage.connect()
			self.storage.insert_one(change_record, self.get_entity_helper())
		finally:
			self.storage.close()

	def delete_by_id(self, record_id: CollectorChangeRecordId):
		try:
			self.storage.connect()
			self.storage.delete_by_id(record_id, self.get_entity_id_helper())
		finally:
			self.storage.close()

	def update_one(self, one: Entity):
		try:
			self.storage.connect()
			self.storage.update_one(one, self.get_entity_id_helper())
		finally:
			self.storage.close()


def get_collector_change_records_service() -> CollectorChangeRecordsService:
	return CollectorChangeRecordsService(ask_meta_storage())
