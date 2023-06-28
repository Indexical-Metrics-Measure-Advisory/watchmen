from typing import Optional

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator

from watchmen_collector_kernel.storage import get_collector_model_config_service
from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_collector_kernel.common import CollectorKernelException
from watchmen_collector_kernel.model import CollectorModelConfig

from watchmen_auth import PrincipalService


class ModelConfigService:

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_name(self, model_name: str) -> Optional[CollectorModelConfig]:
		config = CollectorCacheService.model_config().get(model_name)
		if config is not None:
			return config

		storage_service = get_collector_model_config_service(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService
		)
		model_config: CollectorModelConfig = storage_service.find_by_name(model_name)
		if model_config is None:
			return None

		CollectorCacheService.model_config().put(model_config)
		return model_config


def get_model_config_service(principal_service: PrincipalService) -> ModelConfigService:
	return ModelConfigService(principal_service)
