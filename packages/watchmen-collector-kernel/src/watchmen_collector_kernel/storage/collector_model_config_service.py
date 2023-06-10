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
			'module_id': config.moduleId,
			'depend_on': config.dependOn,
			'priority': config.priority,
			'raw_topic_code': config.rawTopicCode,
			'is_paralleled': config.isParalleled
		})

	def deserialize(self, row: EntityRow) -> CollectorModelConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorModelConfig(
			modelId=row.get('model_id'),
			modelName=row.get('model_name'),
			moduleId=row.get('module_id'),
			dependOn=row.get('depend_on'),
			priority=row.get('priority'),
			rawTopicCode=row.get('raw_topic_code'),
			isParalleled=row.get('is_paralleled')
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

	def create_model_config(self, model_config: CollectorModelConfig) -> CollectorModelConfig:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.create(model_config)
		finally:
			self.storage.close()

	def update_model_config(self, model_config: CollectorModelConfig) -> CollectorModelConfig:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.update(model_config)
		finally:
			self.storage.close()

	def find_by_model_id(self, model_id: str) -> Optional[CollectorModelConfig]:
		self.begin_transaction()
		try:
			return self.storage.find_one(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_id'), right=model_id)]
			))
		finally:
			self.close_transaction()

	def find_by_tenant(self, tenant_id: TenantId) -> Optional[List[CollectorModelConfig]]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)]
		))

	def find_by_name(self, model_name: str) -> Optional[CollectorModelConfig]:
		self.begin_transaction()
		try:
			return self.storage.find_one(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name)]
			))
		finally:
			self.close_transaction()

	def find_by_module_id(self, module_id: str) -> Optional[List[CollectorModelConfig]]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='module_id'), right=module_id)]
		))


def get_collector_model_config_service(storage: TransactionalStorageSPI,
                                       snowflake_generator: SnowflakeGenerator,
                                       principal_service: PrincipalService
                                       ) -> CollectorModelConfigService:
	return CollectorModelConfigService(storage, snowflake_generator, principal_service)
