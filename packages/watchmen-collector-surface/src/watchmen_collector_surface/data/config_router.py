from typing import Callable, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig, CollectorModelConfig
from watchmen_collector_kernel.storage import get_collector_model_config_service, CollectorModelConfigService, \
	get_collector_table_config_service, CollectorTableConfigService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_403

router = APIRouter()


@router.post('/collector/table/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=CollectorTableConfig)
async def save_query_config(
		config: CollectorTableConfig, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> CollectorTableConfig:
	validate_tenant_id(config, principal_service)
	collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	action = ask_save_table_config_action(collector_table_config_service, principal_service)
	return action(config)


# noinspection PyUnusedLocal
def ask_save_table_config_action(
		collector_table_config_service: CollectorTableConfigService, principal_service: PrincipalService
) -> Callable[[CollectorTableConfig], CollectorTableConfig]:
	def action(config: CollectorTableConfig) -> CollectorTableConfig:
		if collector_table_config_service.is_storable_id_faked(config.config_id):
			collector_table_config_service.redress_storable_id(config)
			# noinspection PyTypeChecker
			config = collector_table_config_service.create_config(config)
		else:
			# noinspection PyTypeChecker
			existing_table_config: Optional[CollectorTableConfig] = \
				collector_table_config_service.find_by_id(config.config_id)
			if existing_table_config is not None:
				if existing_table_config.tenantId != config.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			config = collector_table_config_service.update_config(config)

		return config

	return action


@router.post('/collector/model/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=CollectorModelConfig)
async def save_model_config(config: CollectorModelConfig,
                            principal_service: PrincipalService = Depends(
	                            get_any_admin_principal)) -> CollectorModelConfig:
	validate_tenant_id(config, principal_service)
	model_config_service = get_collector_model_config_service(ask_meta_storage(),
	                                                          ask_snowflake_generator(),
	                                                          principal_service)
	action = ask_save_model_config_action(model_config_service, principal_service)
	return action(config)


# noinspection PyUnusedLocal
def ask_save_model_config_action(
		model_config_service: CollectorModelConfigService, principal_service: PrincipalService
) -> Callable[[CollectorModelConfig], CollectorModelConfig]:
	def action(config: CollectorModelConfig) -> CollectorModelConfig:
		if model_config_service.is_storable_id_faked(config.config_id):
			model_config_service.redress_storable_id(config)
			# noinspection PyTypeChecker
			config: CollectorModelConfig = model_config_service.create_model_config(config)
		else:
			# noinspection PyTypeChecker
			existing_model_config: Optional[CollectorModelConfig] = \
				model_config_service.find_by_id(config.config_id)
			if existing_model_config is not None:
				if existing_model_config.tenantId != config.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			config: CollectorModelConfig = \
				model_config_service.update(config)

		return config

	return action