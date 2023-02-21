from logging import getLogger
from typing import Optional, Dict, Any, Tuple

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig
from .extract_source import SourceTableExtractor
from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_storage import TransactionalStorageSPI, SnowflakeGenerator
from watchmen_utilities import ArrayHelper
from .extract_utils import build_criteria_by_join_key

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

	def find_data_by_data_id(self, config: CollectorTableConfig, data_id: Dict) -> Optional[Dict[str, Any]]:
		return SourceTableExtractor(config, self.principal_service).find_by_id(data_id)

	def find_parent_node(self, config: CollectorTableConfig,
	                     data_: Dict) -> Tuple[CollectorTableConfig, Optional[Dict[str, Any]]]:
		if config.parentName:
			parent_config = self.collector_table_config_service.find_by_name(config.parentName)
			parent_data = SourceTableExtractor(parent_config, self.principal_service).find(
				ArrayHelper(config.joinKeys).map(lambda join_key: build_criteria_by_join_key(join_key, data_)).to_list()
			)
			if len(parent_data) != 1:
				raise RuntimeError(f'The data : {data_}, config_name: {config.name}, '
				                   f'parent_config_name: {parent_config.name}, size: {len(parent_data)}')
			return self.find_parent_node(parent_config, parent_data[0])
		else:
			return config, data_

	def build_json(self,
	               config: CollectorTableConfig,
	               data: Dict):
		child_configs = self.collector_table_config_service.find_by_parent_name(config.name)
		if child_configs:
			ArrayHelper(child_configs).map(lambda child_config: self.get_child_data(child_config, data))

	def get_child_data(self, child_config: CollectorTableConfig, data_: Dict):
		child_data = SourceTableExtractor(child_config, self.principal_service).find(
			ArrayHelper(child_config.joinKeys).map(lambda join_key: build_criteria_by_join_key(join_key, data_, True)).to_list()
		)
		if child_data:
			if child_config.isList:
				data_[child_config.label] = child_data
			else:
				data_[child_config.label] = child_data[0]
			ArrayHelper(child_data).each(lambda child: self.build_json(child_config, child))
