from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerModel
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ModelTriggerId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class TriggerModelShaper(EntityShaper):

	def serialize(self, entity: TriggerModel) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'model_trigger_id': entity.modelTriggerId,
			'model_name': entity.modelName,
			'is_finished': entity.isFinished,
			'event_trigger_id': entity.eventTriggerId
		})

	def deserialize(self, row: EntityRow) -> TriggerModel:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerModel(
			modelTriggerId=row.get('model_trigger_id'),
			modelName=row.get('model_name'),
			isFinished=row.get('is_finished'),
			eventTriggerId=row.get('event_trigger_id')
		))


TRIGGER_MODEL_TABLE = 'trigger_model'
TRIGGER_MODEL_ENTITY_SHAPER = TriggerModelShaper()


class TriggerModelService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return TRIGGER_MODEL_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return TRIGGER_MODEL_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'model_trigger_id'

	def get_storable_id(self, storable: TriggerModel) -> StorableId:
		return storable.modelTriggerId

	def set_storable_id(
			self, storable: TriggerModel, storable_id: ModelTriggerId) -> Storable:
		storable.modelTriggerId = storable_id
		return storable

	def find_trigger_by_id(self, trigger_id: str) -> Optional[TriggerModel]:
		self.begin_transaction()
		try:
			return self.find_by_id(trigger_id)
		finally:
			self.close_transaction()


def get_trigger_model_service(storage: TransactionalStorageSPI,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService
                              ) -> TriggerModelService:
	return TriggerModelService(storage, snowflake_generator, principal_service)
