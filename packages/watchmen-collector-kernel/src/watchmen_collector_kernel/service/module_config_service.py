from typing import Optional

from watchmen_utilities import get_current_time_in_seconds

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator

from watchmen_collector_kernel.storage import get_collector_module_config_service
from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_data_kernel.meta import TopicService
from watchmen_collector_kernel.model import CollectorModuleConfig

from watchmen_auth import PrincipalService


class ModuleConfigService:

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_module_id(self, module_id: str, tenant_id: str) -> CollectorModuleConfig:
		if module_id.startswith("f-"):
			return self.find_by_topic_id(module_id.removeprefix("f-"), tenant_id)
		else:
			config = CollectorCacheService.module_config().get(module_id)
			if config is not None:
				return config

			storage_service = get_collector_module_config_service(
				ask_meta_storage(), ask_snowflake_generator(), self.principalService
			)
			module_config: CollectorModuleConfig = storage_service.find_by_module_id(module_id)
			CollectorCacheService.module_config().put(module_config)
			return module_config

	# noinspection PyMethodMayBeStatic
	def fake_id(self, topic_id: str) -> str:
		return f"f-{topic_id}"

	def find_by_topic_id(self, topic_id: str, tenant_id: str) -> Optional[CollectorModuleConfig]:
		schema = TopicService(self.principalService).find_schema_by_id(topic_id, tenant_id)
		now = get_current_time_in_seconds()
		if schema:
			return CollectorModuleConfig(
				moduleId=self.fake_id(schema.topic.topicId),
				moduleName=schema.topic.name,
				priority=0,
				tenantId=tenant_id,
				createdAt=now,
				createdBy=self.principalService.get_user_id(),
				lastModifiedAt=now,
				lastModifiedBy=self.principalService.get_user_id()
			)

		return None


def get_module_config_service(principal_service: PrincipalService) -> ModuleConfigService:
	return ModuleConfigService(principal_service)
