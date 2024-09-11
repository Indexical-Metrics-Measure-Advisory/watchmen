from typing import Optional, List

from watchmen_data_kernel.meta import TopicService

from watchmen_utilities import is_blank, get_current_time_in_seconds

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator

from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_collector_kernel.model import CollectorTableConfig

from watchmen_auth import PrincipalService


class TableConfigService:

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_name(self, name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		config = CollectorCacheService.table_config().get_config_by_name(name, tenant_id)
		if config is not None:
			return config

		storage_service = get_collector_table_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		table_config: CollectorTableConfig = storage_service.find_by_name(name, tenant_id)
		if table_config is None:
			table_config = self.find_by_topic_name(name, tenant_id)

		if table_config is None:
			return None

		CollectorCacheService.table_config().put_config_by_name(table_config)
		return table_config

	def find_by_parent_name(self, parent_name: Optional[str], tenant_id: str) -> Optional[List[CollectorTableConfig]]:
		if is_blank(parent_name):
			return None

		configs = CollectorCacheService.table_config().get_configs_by_parent_name(parent_name, tenant_id)
		if configs is not None:
			return configs

		storage_service = get_collector_table_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		table_configs: List[CollectorTableConfig] = storage_service.find_by_parent_name(parent_name, tenant_id)
		if table_configs is None:
			return None

		CollectorCacheService.table_config().put_configs_by_parent_name(parent_name, tenant_id, table_configs)
		return table_configs

	# noinspection PyMethodMayBeStatic
	def fake_config_id(self, topic_id: str) -> str:
		return f"f-{topic_id}"

	# noinspection PyMethodMayBeStatic
	def get_topic_name_by_table_name(self, table_name: str) -> str:
		return table_name.removeprefix("topic_")

	# noinspection PyMethodMayBeStatic
	def get_table_name_by_topic_name(self, topic_name: str) -> str:
		return "topic_" + topic_name

	def find_by_topic_name(self, name: str, tenant_id: str) -> Optional[CollectorTableConfig]:
		topic_name = name
		schema = TopicService(self.principalService).find_schema_by_name(topic_name, tenant_id)
		now = get_current_time_in_seconds()
		if schema:
			return CollectorTableConfig(
				configId=self.fake_config_id(schema.topic.topicId),
				name=topic_name,
				tableName=self.get_table_name_by_topic_name(name),
				primaryKey=["id_"],
				objectKey="id_",
				sequenceKey=None,
				modelName=topic_name,
				parentName=None,
				joinKeys=[],
				dependOn=[],
				conditions=[],
				ignoredColumns=[],
				jsonColumns=[],
				label=None,
				auditColumn="update_time_",
				dataSourceId=schema.topic.dataSourceId,
				isList=0,
				triggered=0,
				tenantId=tenant_id,
				createdAt=now,
				createdBy=self.principalService.get_user_id(),
				lastModifiedAt=now,
				lastModifiedBy=self.principalService.get_user_id()
			)

		return None


def get_table_config_service(principal_service: PrincipalService) -> TableConfigService:
	return TableConfigService(principal_service)
