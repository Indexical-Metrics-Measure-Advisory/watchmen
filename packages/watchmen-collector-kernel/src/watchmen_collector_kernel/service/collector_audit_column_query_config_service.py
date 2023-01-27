from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorAuditColumnQueryConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator


class CollectorAuditColumnQueryConfigShaper(EntityShaper):
	def serialize(self, config: CollectorAuditColumnQueryConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'config_id': config.config_id,
			'name': config.name,
			'table_name': config.table_name,
			'module_name': config.module,
			'parent_name': config.parent_name,
			'join_key': config.join_key,
			'disabled': config.disabled,
			'filter_criteria': config.filter_criteria,
			'dependency': config.dependency,
			'triggered': config.triggered,
			'audit_column': config.audit_column,
			'data_source_id': config.data_source_id,
			'is_list': config.is_list
		})

	def deserialize(self, row: EntityRow) -> CollectorAuditColumnQueryConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorAuditColumnQueryConfig(
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


COLLECTOR_AUDIT_COLUMN_QUERY_CONFIG_ENTITY_NAME = 'collector_audit_column_query_config'
COLLECTOR_AUDIT_COLUMN_QUERY_CONFIG_ENTITY_SHAPER = CollectorAuditColumnQueryConfigShaper()


class CollectorAuditColumnQueryConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_AUDIT_COLUMN_QUERY_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_AUDIT_COLUMN_QUERY_CONFIG_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return "config_id"

	def get_storable_id(self, storable: CollectorAuditColumnQueryConfig) -> StorableId:
		return storable.config_id

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: CollectorAuditColumnQueryConfig, storable_id: StorableId) -> Storable:
		storable.config_id = storable_id
		return storable


def get_collector_audit_column_query_config_service(storage: TransactionalStorageSPI,
                                                    snowflake_generator: SnowflakeGenerator,
                                                    principal_service: PrincipalService
                                                    ) -> CollectorAuditColumnQueryConfigService:
	return CollectorAuditColumnQueryConfigService(storage, snowflake_generator, principal_service)
