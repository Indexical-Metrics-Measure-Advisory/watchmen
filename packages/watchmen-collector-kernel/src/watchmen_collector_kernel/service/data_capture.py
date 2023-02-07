from logging import getLogger
from typing import Optional, Dict, Any, Tuple

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_collector_kernel.model.collector_table_config import JoinKey
from .extract_source import SourceTableExtractor
from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_storage import EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaStatement, \
	TransactionalStorageSPI, SnowflakeGenerator
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class DataCaptureService:

	def __init__(self, storage: TransactionalStorageSPI,
	             snowflake_generator: SnowflakeGenerator,
	             principal_service: PrincipalService):
		self.meta_storage = storage
		self.snowflake_generator = snowflake_generator
		self.principal_service = principal_service
		self.collector_table_config_service = get_collector_table_config_service(self.meta_storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)

	def find_parent_node(self, config: CollectorTableConfig,
	                     data_id: str) -> Tuple[CollectorTableConfig, Optional[Dict[str, Any]]]:
		data = SourceTableExtractor(config, self.principal_service).find_by_data_id(config.primaryKey, data_id)
		if config.parentName:

			def get_criteria_by_join_key(join_key: JoinKey) -> EntityCriteriaStatement:
				column_name = join_key.parent_key
				column_value = data.get(join_key.child_key)
				return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column_name), right=column_value)

			parent_config = self.collector_table_config_service.find_by_name(config.parentName)
			parent_data = SourceTableExtractor(parent_config, self.principal_service).find_ids(
				ArrayHelper(config.joinKeys).map(lambda join_key: get_criteria_by_join_key(join_key)).to_list()
			)

			if len(parent_data) != 1:
				raise RuntimeError(f'The data of {data_id} is error: {config.name}, {parent_config.name}')
			parent_data_id = parent_data[0].get(parent_config.primaryKey)
			return self.find_parent_node(parent_config, parent_data_id)
		else:
			return config, data

	def build_json(self,
	               config: CollectorTableConfig,
	               data: Dict):

		def get_criteria_by_join_key(join_key: JoinKey) -> EntityCriteriaStatement:
			column_name = join_key.child_key
			column_value = data.get(join_key.parent_key)
			return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column_name), right=column_value)

		def get_child_data(table_config: CollectorTableConfig):
			child_data = SourceTableExtractor(table_config, self.principal_service).find(
				ArrayHelper(config.joinKeys).map(lambda join_key: get_criteria_by_join_key(join_key)).to_list()
			)
			data[table_config.labelName] = child_data
			ArrayHelper(child_data).each(lambda child: self.build_json(table_config, child))

		child_configs = self.collector_table_config_service.find_by_parent_name(config.name)
		if child_configs:
			ArrayHelper(child_configs).each(lambda child_config: get_child_data(child_config))
		else:
			return

