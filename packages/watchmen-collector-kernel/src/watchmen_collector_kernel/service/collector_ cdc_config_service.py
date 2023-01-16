from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable
from watchmen_storage import EntityName, EntityShaper, EntityRow


class CollectorTableConfigShaper(EntityShaper):
	def serialize(self, config: CollectorTableConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'config_id': config.config_id,
			'name': config.name,
			'table_name': config.table_name,
			'module_name': config.module,
			'parent_name': config.parent_name,
			'join_key': config.join_key,
			'disabled': config.disabled,
			'filter_criteria':  config.filter_criteria,
			'dependency': config.dependency,
			'triggered': config.triggered,
			'audit_column': config.audit_column,
			'data_source_id': config.data_source_id,
			'is_list': config.is_list
		})

	def deserialize(self, row: EntityRow) -> CollectorTableConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorTableConfig(
			config_id=row.get('config_id'),
			name=row.get('name'),
			table_name=row.get('table_name'),
			module=row.get('module'),
			parent_name=row.get('parent_name'),
			join_key=row.get('join_key'),
			disabled=row.get('disabled'),
			filter_criteria=row.get('filter_criteria'),
			dependency=row.get('dependency'),
			triggered=row.get('triggered'),
			audit_column=row.get('audit_column'),
			data_source_id=row.get('data_source_id'),
			is_list=row.get('is_list')
		))


COLLECTOR_TABLE_CONFIG_ENTITY_NAME = 'collector_table_config'
COLLECTOR_TABLE_CONFIG_ENTITY_SHAPER = CollectorTableConfigShaper()


class CollectorTableConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_TABLE_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_TABLE_CONFIG_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return "config_id"

	def get_storable_id(self, storable: CollectorTableConfig) -> StorableId:
		return storable.config_id

	def set_storable_id(self, storable: CollectorTableConfig, storable_id: StorableId) -> Storable:
		storable.config_id = storable_id
		return storable
