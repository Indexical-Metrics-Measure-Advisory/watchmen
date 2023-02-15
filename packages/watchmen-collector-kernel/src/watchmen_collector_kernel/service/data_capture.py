from logging import getLogger
from typing import Optional, Dict, Any, Tuple, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_collector_kernel.model.collector_table_config import JoinKey
from .extract_source import SourceTableExtractor
from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_storage import EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaStatement, \
	TransactionalStorageSPI, SnowflakeGenerator
from watchmen_utilities import ArrayHelper
from ..common import COMMA

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
		data = SourceTableExtractor(config, self.principal_service).find_by_data_id(
			convert_pk_criteria(config.primaryKey, data_id))
		if config.parentName:

			def get_criteria_by_join_key(join_key: JoinKey) -> EntityCriteriaStatement:
				column_name = join_key.parentKey
				column_value = data.get(join_key.childKey)
				return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column_name), right=column_value)

			parent_config = self.collector_table_config_service.find_by_name(config.parentName)
			parent_data = SourceTableExtractor(parent_config, self.principal_service).find_pk_columns(
				ArrayHelper(config.joinKeys).map(lambda join_key: get_criteria_by_join_key(join_key)).to_list()
			)

			if len(parent_data) != 1:
				raise RuntimeError(f'The data id: {data_id}, config_name: {config.name}, '
				                   f'parent_config_name: {parent_config.name}, size: {len(parent_data)}')
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
			data[table_config.label] = child_data
			ArrayHelper(child_data).each(lambda child: self.build_json(table_config, child))

		child_configs = self.collector_table_config_service.find_by_parent_name(config.name)
		if child_configs:
			ArrayHelper(child_configs).each(lambda child_config: get_child_data(child_config))
		else:
			return


def convert_pk_criteria(pk_columns: List[str], data_id: str) -> List[EntityCriteriaExpression]:
	pk_values = data_id.split(COMMA)
	if len(pk_columns) != len(pk_values):
		raise ValueError(
			f'The number of primary key fields {len(pk_columns)} does not match the number of values {len(pk_values)}'
		)
	else:
		def convert_criteria(column_name: str, index_: int) -> EntityCriteriaExpression:
			return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column_name), right=pk_values[index_])
		return ArrayHelper(pk_columns).map_with_index(convert_criteria).to_list()


def convert_pk_value(data_: Dict[str, Any], pk_columns: List[str]) -> str:
	return ArrayHelper(pk_columns).map(lambda column_name: data_.get(column_name)).join(COMMA)