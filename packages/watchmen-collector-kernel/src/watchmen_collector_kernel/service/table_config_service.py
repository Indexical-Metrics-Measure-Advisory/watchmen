from typing import Optional, List

from watchmen_utilities import is_blank

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator

from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_collector_kernel.common import CollectorKernelException
from watchmen_collector_kernel.model import CollectorTableConfig

from watchmen_auth import PrincipalService


class TableConfigService:

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_table_name(self, table_name: str) -> Optional[CollectorTableConfig]:
		config = CollectorCacheService.table_config().get_config_by_table_name(table_name)
		if config is not None:
			return config

		storage_service = get_collector_table_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		table_config: CollectorTableConfig = storage_service.find_by_table_name(table_name)
		if table_config is None:
			return None

		CollectorCacheService.table_config().put_config_by_table_name(table_config)
		return table_config

	def find_by_name(self, name: str) -> Optional[CollectorTableConfig]:
		config = CollectorCacheService.table_config().get_config_by_name(name)
		if config is not None:
			return config

		storage_service = get_collector_table_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		table_config: CollectorTableConfig = storage_service.find_by_name(name)
		if table_config is None:
			return None

		CollectorCacheService.table_config().put_config_by_name(table_config)
		return table_config

	def find_by_parent_name(self, parent_name: Optional[str]) -> Optional[List[CollectorTableConfig]]:
		if is_blank(parent_name):
			return None

		configs = CollectorCacheService.table_config().get_configs_by_parent_name(parent_name)
		if configs is not None:
			return configs

		storage_service = get_collector_table_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		table_configs: List[CollectorTableConfig] = storage_service.find_by_parent_name(parent_name)
		if table_configs is None:
			return None

		CollectorCacheService.table_config().put_configs_by_parent_name(parent_name, table_configs)
		return table_configs


def get_table_config_service(principal_service: PrincipalService) -> TableConfigService:
	return TableConfigService(principal_service)
