from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, KafkaCollectorConfigId, Pageable, TenantId
from watchmen_model.system import KafkaCollectorConfig
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper


class KafkaCollectorConfigShaper(EntityShaper):
	def serialize(self, config: KafkaCollectorConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'config_id': config.configId,
			'config_code': config.configCode,
			'name': config.name,
			'batch_size': config.batchSize,
			'bootstrap_servers': config.bootstrapServers,
			'group_id': config.groupId,
			'enable_auto_commit': config.enableAutoCommit,
			'auto_offset_reset': config.autoOffsetReset,
			'topic_pattern': config.topicPattern,
			'session_timeout_ms': config.sessionTimeoutMs,
			'max_poll_interval_ms': config.maxPollIntervalMs
		})

	def deserialize(self, row: EntityRow) -> KafkaCollectorConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, KafkaCollectorConfig(
			configId=row.get('config_id'),
			configCode=row.get('config_code'),
			name=row.get('name'),
			batchSize=row.get('batch_size'),
			bootstrapServers=row.get('bootstrap_servers'),
			groupId=row.get('group_id'),
			enableAutoCommit=row.get('enable_auto_commit'),
			autoOffsetReset=row.get('auto_offset_reset'),
			topicPattern=row.get('topic_pattern'),
			sessionTimeoutMs=row.get('session_timeout_ms'),
			maxPollIntervalMs=row.get('max_poll_interval_ms')
		))


KAFKA_COLLECTOR_CONFIG_ENTITY_NAME = 'kafka_collector_configs'
KAFKA_COLLECTOR_CONFIG_ENTITY_SHAPER = KafkaCollectorConfigShaper()


class KafkaCollectorConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return KAFKA_COLLECTOR_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return KAFKA_COLLECTOR_CONFIG_ENTITY_SHAPER

	def get_storable_id(self, storable: KafkaCollectorConfig) -> KafkaCollectorConfigId:
		return storable.configId

	def set_storable_id(self, storable: KafkaCollectorConfig, storable_id: KafkaCollectorConfigId) \
			-> KafkaCollectorConfig:
		storable.configId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'config_id'

	# noinspection DuplicatedCode
	def find_by_text(
			self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[KafkaCollectorConfig]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
