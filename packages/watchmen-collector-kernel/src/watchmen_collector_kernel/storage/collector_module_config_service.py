from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorModuleConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, TenantId, CollectorModelConfigId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral


class CollectorModuleConfigShaper(EntityShaper):
	def serialize(self, config: CollectorModuleConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'module_id': config.moduleId,
			'module_name': config.moduleName,
			'priority': config.priority
		})

	def deserialize(self, row: EntityRow) -> CollectorModuleConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorModuleConfig(
			moduleId=row.get('module_id'),
			moduleName=row.get('module_name'),
			priority=row.get('priority')
		))


COLLECTOR_MODULE_CONFIG_ENTITY_NAME = 'collector_module_config'
COLLECTOR_MODULE_CONFIG_ENTITY_SHAPER = CollectorModuleConfigShaper()


class CollectorModuleConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_MODULE_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_MODULE_CONFIG_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return "module_id"

	def get_storable_id(self, storable: CollectorModuleConfig) -> StorableId:
		return storable.moduleId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: CollectorModuleConfig, storable_id: CollectorModelConfigId) -> Storable:
		storable.moduleId = storable_id
		return storable

	def create_module_config(self, module_config: CollectorModuleConfig) -> CollectorModuleConfig:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.create(module_config)
		finally:
			self.storage.close()

	def update_module_config(self, module_config: CollectorModuleConfig) -> CollectorModuleConfig:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.update(module_config)
		finally:
			self.storage.close()

	def find_by_module_id(self, module_id: str) -> Optional[CollectorModuleConfig]:
		self.begin_transaction()
		try:
			return self.storage.find_one(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='module_id'), right=module_id)]
			))
		finally:
			self.close_transaction()

	def find_by_tenant(self, tenant_id: TenantId) -> Optional[List[CollectorModuleConfig]]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)]
		))

	def find_by_name(self, module_name: str) -> Optional[CollectorModuleConfig]:
		self.begin_transaction()
		try:
			return self.storage.find_one(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='module_name'), right=module_name)]
			))
		finally:
			self.close_transaction()


def get_collector_module_config_service(storage: TransactionalStorageSPI,
                                        snowflake_generator: SnowflakeGenerator,
                                        principal_service: PrincipalService
                                        ) -> CollectorModuleConfigService:
	return CollectorModuleConfigService(storage, snowflake_generator, principal_service)
