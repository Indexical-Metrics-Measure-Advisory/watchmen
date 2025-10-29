from typing import Optional, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, TenantId, Pageable, DataPage
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaOperator
from watchmen_utilities import ArrayHelper, is_not_blank


class CollectorTableConfigShaper(EntityShaper):
	def serialize(self, config: CollectorTableConfig) -> EntityRow:
		return TupleShaper.serialize_tenant_based(config, {
			'config_id': config.configId,
			'name': config.name,
			'table_name': config.tableName,
			'primary_key': config.primaryKey,
			'object_key': config.objectKey,
			'sequence_key': config.sequenceKey,
			'model_name': config.modelName,
			'parent_name': config.parentName,
			'join_keys': ArrayHelper(config.joinKeys).map(lambda x: x.to_dict()).to_list(),
			'depend_on': ArrayHelper(config.dependOn).map(lambda x: x.to_dict()).to_list(),
			'conditions': ArrayHelper(config.conditions).map(lambda x: x.to_dict()).to_list(),
			'ignored_columns': config.ignoredColumns,
			'json_columns': ArrayHelper(config.jsonColumns).map(lambda x: x.to_dict()).to_list(),
			'label': config.label,
			'audit_column': config.auditColumn,
			'data_source_id': config.dataSourceId,
			'is_list': config.isList,
			'triggered': config.triggered
		})

	def deserialize(self, row: EntityRow) -> CollectorTableConfig:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, CollectorTableConfig(
			configId=row.get('config_id'),
			name=row.get('name'),
			tableName=row.get('table_name'),
			primaryKey=row.get('primary_key'),
			objectKey=row.get('object_key'),
			sequenceKey=row.get('sequence_key'),
			modelName=row.get('model_name'),
			parentName=row.get('parent_name'),
			joinKeys=row.get('join_keys'),
			dependOn=row.get('depend_on'),
			conditions=row.get('conditions'),
			ignoredColumns=row.get('ignored_columns'),
			jsonColumns=row.get('json_columns'),
			label=row.get('label'),
			auditColumn=row.get('audit_column'),
			dataSourceId=row.get('data_source_id'),
			isList=row.get('is_list'),
			triggered=row.get('triggered')
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

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return "config_id"

	def get_storable_id(self, storable: CollectorTableConfig) -> StorableId:
		return storable.configId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: CollectorTableConfig, storable_id: StorableId) -> Storable:
		storable.configId = storable_id
		return storable

	# noinspection PyTypeChecker
	def create_config(self, config: CollectorTableConfig) -> CollectorTableConfig:
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
	def update_config(self, config: CollectorTableConfig) -> CollectorTableConfig:
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

	def find_config_by_id(self, config_id: str) -> Optional[CollectorTableConfig]:
		self.begin_transaction()
		try:
			return self.find_by_id(config_id)
		finally:
			self.close_transaction()

	def find_by_table_name(self, table_name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find_one(
				self.get_entity_finder(
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='table_name'),
						                         right=table_name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
						                         right=tenant_id)
					]
				)
			)
		finally:
			self.storage.close()

	def find_by_table_name_and_tenant_id(self, table_name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find_one(
				self.get_entity_finder(
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='table_name'),
						                         right=table_name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
						                         right=tenant_id)
					]
				)
			)
		finally:
			self.storage.close()

	def find_by_name(self, name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find_one(
				self.get_entity_finder(
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'),
						                         right=name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
						                         right=tenant_id),
					]
				)
			)
		finally:
			self.storage.close()

	def find_by_parent_name(self, parent_name: str, tenant_id: str) -> Optional[List[CollectorTableConfig]]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find(
				self.get_entity_finder(
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='parent_name'),
						                         right=parent_name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
						                         right=tenant_id)
					]
				)
			)
		finally:
			self.storage.close()

	def find_by_model_name(self, model_name: str, tenant_id: str) -> Optional[List[CollectorTableConfig]]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='triggered'), right=True)
			]
		))

	def find_root_table_config(self, model_name: str, tenant_id: str) -> Optional[List[CollectorTableConfig]]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'),
					                         right=model_name),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='parent_name'), operator='is-empty'),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
				]
			))
		finally:
			self.storage.close()
	def find_all(self, tenant_id: Optional[TenantId]) -> List[CollectorTableConfig]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))


	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		try:
			self.storage.connect()
			criteria = []
			if text is not None and len(text.strip()) != 0:
				criteria.append(EntityCriteriaJoint(
					conjunction=EntityCriteriaJointConjunction.OR,
					children=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
							right=text)
					]
				))
			if tenant_id is not None and len(tenant_id.strip()) != 0:
				criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
			return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))
		finally:
			self.storage.close()



def get_collector_table_config_service(storage: TransactionalStorageSPI,
                                       snowflake_generator: SnowflakeGenerator,
                                       principal_service: PrincipalService
                                       ) -> CollectorTableConfigService:
	return CollectorTableConfigService(storage, snowflake_generator, principal_service)