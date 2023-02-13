from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorModelConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, TenantId, CollectorModelConfigId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral


class CollectorModelConfigShaper(EntityShaper):
	def serialize(self, config: CollectorModelConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'model_id': config.modelId,
			'model_name': config.modelName,
			'depend_on': config.dependOn,
			'raw_topic_code': config.rawTopicCode
		})

	def deserialize(self, row: EntityRow) -> CollectorModelConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorModelConfig(
			modelId=row.get('model_id'),
			modelName=row.get('model_name'),
			dependOn=row.get('depend_on'),
			rawTopicCode=row.get('raw_topic_code')
		))


COLLECTOR_MODEL_CONFIG_ENTITY_NAME = 'collector_model_config'
COLLECTOR_MODEL_CONFIG_ENTITY_SHAPER = CollectorModelConfigShaper()


class CollectorModelConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_MODEL_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_MODEL_CONFIG_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return "model_id"

	def get_storable_id(self, storable: CollectorModelConfig) -> StorableId:
		return storable.modelId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: CollectorModelConfig, storable_id: CollectorModelConfigId) -> Storable:
		storable.modelId = storable_id
		return storable

	def find_by_tenant(self, tenant_id: TenantId) -> Optional[List[CollectorModelConfig]]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)]
		))

	def create_model_config(self, model_config: CollectorModelConfig) -> CollectorModelConfig:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.create(model_config)
		finally:
			self.storage.close()


def get_collector_model_config_service(storage: TransactionalStorageSPI,
                                       snowflake_generator: SnowflakeGenerator,
                                       principal_service: PrincipalService
                                       ) -> CollectorModelConfigService:
	return CollectorModelConfigService(storage, snowflake_generator, principal_service)
