from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorPluginConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class CollectorPluginConfigShaper(EntityShaper):
	def serialize(self, config: CollectorPluginConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'plugin_id': config.pluginId,
			'name': config.name,
			'table_name': config.tableName,
			'primary_key': config.primaryKey,
			'conditions': config.conditions,
			'data_source_id': config.dataSourceId
		})

	def deserialize(self, row: EntityRow) -> CollectorPluginConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorPluginConfig(
			pluginId=row.get('plugin_id'),
			name=row.get('name'),
			tableName=row.get('table_name'),
			primaryKey=row.get('primary_key'),
			conditions=row.get('conditions'),
			dataSourceId=row.get('data_source_id')
		))


COLLECTOR_PLUGIN_CONFIG_ENTITY_NAME = 'collector_plugin_config'
COLLECTOR_PLUGIN_CONFIG_ENTITY_SHAPER = CollectorPluginConfigShaper()


class CollectorPluginConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_PLUGIN_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_PLUGIN_CONFIG_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return "plugin_id"

	def get_storable_id(self, storable: CollectorPluginConfig) -> StorableId:
		return storable.pluginId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: CollectorPluginConfig, storable_id: StorableId) -> Storable:
		storable.configId = storable_id
		return storable

	# noinspection PyTypeChecker
	def create_config(self, config: CollectorPluginConfig) -> CollectorPluginConfig:
		self.begin_transaction()
		try:
			config = self.create(config)
			self.commit_transaction()
			return config
		except Exception as e:
			self.rollback_transaction()
			raise e

	# noinspection PyTypeChecker
	def update_config(self, config: CollectorPluginConfig) -> CollectorPluginConfig:
		self.begin_transaction()
		try:
			config = self.update(config)
			self.commit_transaction()
			return config
		except Exception as e:
			self.rollback_transaction()
			raise e

	def find_config_by_id(self, plugin_id: str) -> Optional[CollectorPluginConfig]:
		self.begin_transaction()
		try:
			return self.find_by_id(plugin_id)
		finally:
			self.close_transaction()


def get_collector_plugin_config_service(storage: TransactionalStorageSPI,
                                        snowflake_generator: SnowflakeGenerator,
                                        principal_service: PrincipalService
                                        ) -> CollectorPluginConfigService:
	return CollectorPluginConfigService(storage, snowflake_generator, principal_service)
