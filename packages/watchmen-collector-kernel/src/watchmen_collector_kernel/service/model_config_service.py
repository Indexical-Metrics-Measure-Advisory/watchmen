from typing import Optional

from watchmen_utilities import get_current_time_in_seconds

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator

from watchmen_collector_kernel.storage import get_collector_model_config_service
from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_collector_kernel.common import CollectorKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_collector_kernel.model import CollectorModelConfig

from watchmen_auth import PrincipalService


class ModelConfigService:

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_name(self, model_name: str, tenant_id: str) -> Optional[CollectorModelConfig]:
		config = CollectorCacheService.model_config().get(model_name, tenant_id)
		if config is not None:
			return config

		storage_service = get_collector_model_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		model_config: CollectorModelConfig = storage_service.find_by_name(model_name, tenant_id)
		if model_config is None:
			model_config = self.find_by_topic_name(model_name, tenant_id)

		if model_config is None:
			return None

		CollectorCacheService.model_config().put(model_config)
		return model_config

	# noinspection PyMethodMayBeStatic
	def fake_id(self, topic_id: str) -> str:
		return f"f-{topic_id}"

	def find_by_topic_name(self, topic_name: str, tenant_id: str) -> Optional[CollectorModelConfig]:
		schema = TopicService(self.principalService).find_schema_by_name(topic_name, tenant_id)
		now = get_current_time_in_seconds()
		if schema:
			return CollectorModelConfig(
				modelId=self.fake_id(schema.topic.topicId),
				modelName=topic_name,
				moduleId=self.fake_id(schema.topic.topicId),
				dependOn=[],
				priority=0,
				rawTopicCode=topic_name,
				isParalleled=True,
				tenantId=tenant_id,
				createdAt=now,
				createdBy=self.principalService.get_user_id(),
				lastModifiedAt=now,
				lastModifiedBy=self.principalService.get_user_id()
			)

		return None

def get_model_config_service(principal_service: PrincipalService) -> ModelConfigService:
	return ModelConfigService(principal_service)
