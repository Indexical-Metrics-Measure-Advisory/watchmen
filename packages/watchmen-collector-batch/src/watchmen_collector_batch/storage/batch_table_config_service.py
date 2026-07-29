from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_batch.model.batch_table_config import BatchTableConfig
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, TenantId, Pageable, DataPage
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaOperator, EntityDeleter
from watchmen_utilities import ArrayHelper, is_not_blank


class CollectorBatchTableConfigShaper(EntityShaper):
	def serialize(self, config: BatchTableConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'config_id': config.configId,
			'name': config.name,
			'source_table_name': config.sourceTableName,
			'target_table_name': config.targetTableName,
			'fields_mapping': ArrayHelper(config.fieldsMapping).map(lambda x: x.to_dict()).to_list(),
			'primary_key': config.primaryKey,
			'action_type': config.actionType,
			'pipeline_id': config.pipelineId,
			'loop_entity_name': config.loopEntityName
		})

	def deserialize(self, row: EntityRow) -> BatchTableConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, BatchTableConfig(
			configId=row.get('config_id'),
			name=row.get('name'),
			sourceTableName=row.get('source_table_name'),
			targetTableName=row.get('target_table_name'),
			fieldsMapping=row.get('fields_mapping'),
			primaryKey=row.get('primary_key'),
			actionType=row.get('action_type'),
			pipelineId=row.get('pipeline_id'),
			loopEntityName=row.get('loop_entity_name')
		))

COLLECTOR_BATCH_TABLE_CONFIG_ENTITY_NAME = 'collector_batch_table_config'
COLLECTOR_BATCH_TABLE_CONFIG_ENTITY_SHAPER = CollectorBatchTableConfigShaper()


class CollectorBatchTableConfigService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return COLLECTOR_BATCH_TABLE_CONFIG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_BATCH_TABLE_CONFIG_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return "config_id"

	def get_storable_id(self, storable: BatchTableConfig) -> StorableId:
		return storable.configId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: BatchTableConfig, storable_id: StorableId) -> Storable:
		storable.configId = storable_id
		return storable

	# noinspection PyTypeChecker
	def create_config(self, config: BatchTableConfig) -> BatchTableConfig:
		self.begin_transaction()
		try:
			config = self.create(config)
			self.commit_transaction()
			return config
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	# noinspection PyTypeChecker
	def update_config(self, config: BatchTableConfig) -> BatchTableConfig:
		self.begin_transaction()
		try:
			config = self.update(config)
			self.commit_transaction()
			return config
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def find_config_by_id(self, config_id: str) -> Optional[BatchTableConfig]:
		self.begin_transaction()
		try:
			return self.find_by_id(config_id)
		finally:
			self.close_transaction()

	def find_batch_table_config_by_names(self,
	                                     name: str,
	                                     source_table_name: str,
	                                     target_table_name: str,
	                                     tenant_id: str) -> Optional[BatchTableConfig]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find_one(
				self.get_entity_finder(
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'),
						                         right=name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='source_table_name'),
						                         right=source_table_name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='target_table_name'),
						                         right=target_table_name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
						                         right=tenant_id)
					]
				)
			)
		finally:
			self.storage.close()

	
	def find_all(self, tenant_id: Optional[TenantId]) -> List[BatchTableConfig]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def delete_by_tenant_id(self, tenant_id: int) -> None:
		self.storage.begin()
		try:
			self.storage.delete(
				EntityDeleter(
					name=COLLECTOR_BATCH_TABLE_CONFIG_ENTITY_NAME,
					shaper=COLLECTOR_BATCH_TABLE_CONFIG_ENTITY_SHAPER,
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
					]
				)
			)
			self.storage.commit_and_close()
		except Exception as e:
			self.storage.rollback_and_close()
			raise e
		finally:
			self.storage.close()
			

def get_collector_batch_table_config_service(storage: TransactionalStorageSPI,
                                       snowflake_generator: SnowflakeGenerator,
                                       principal_service: PrincipalService
                                       ) -> CollectorBatchTableConfigService:
	return CollectorBatchTableConfigService(storage, snowflake_generator, principal_service)