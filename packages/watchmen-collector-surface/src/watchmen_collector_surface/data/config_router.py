from typing import Callable, Optional, Dict, List

from fastapi import APIRouter, Depends, Body
from watchmen_collector_kernel.service import DataCaptureService

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig, CollectorModelConfig, CollectorModuleConfig
from watchmen_collector_kernel.storage import get_collector_model_config_service, CollectorModelConfigService, \
	get_collector_table_config_service, CollectorTableConfigService, get_collector_module_config_service, \
	CollectorModuleConfigService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import Pageable, DataPage, TenantId
from watchmen_rest import get_any_admin_principal, get_console_principal
from watchmen_rest.util import validate_tenant_id, raise_403, raise_400, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


@router.get('/collector/table/config', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_table_config_by_id(
		table_config_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> CollectorTableConfig:
	if is_blank(table_config_id):
		raise_400('collector table config id is required.')
	
	collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	
	def action() -> CollectorTableConfig:
		# noinspection PyTypeChecker
		table_config: CollectorTableConfig = collector_table_config_service.find_config_by_id(table_config_id)
		if table_config is None:
			raise_404()
		# tenant id must match current principal's
		if table_config.tenantId != principal_service.get_tenant_id():
			raise_404()
		return table_config
	
	return action()


class QueryTableConfigDataPage(DataPage):
	data: List[CollectorTableConfig]


@router.post('/collector/table/config/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_tables_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryTableConfigDataPage:
	collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	def action() -> QueryTableConfigDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return collector_table_config_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return collector_table_config_service.find_page_by_text(query_name, tenant_id, pageable)
	
	return action()


@router.post('/collector/table/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=CollectorTableConfig)
async def save_table_config(
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
		if collector_table_config_service.is_storable_id_faked(config.configId):
			collector_table_config_service.redress_storable_id(config)
			# noinspection PyTypeChecker
			config = collector_table_config_service.create_config(config)
		else:
			# noinspection PyTypeChecker
			existing_table_config: Optional[CollectorTableConfig] = collector_table_config_service.find_config_by_id(
				config.configId)
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
		if model_config_service.is_storable_id_faked(config.modelId):
			model_config_service.redress_storable_id(config)
			# noinspection PyTypeChecker
			config: CollectorModelConfig = model_config_service.create_model_config(config)
		else:
			# noinspection PyTypeChecker
			existing_model_config: Optional[CollectorModelConfig] = \
				model_config_service.find_by_model_id(config.modelId)
			if existing_model_config is not None:
				if existing_model_config.tenantId != config.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			config: CollectorModelConfig = \
				model_config_service.update_model_config(config)

		return config

	return action


@router.post('/collector/module/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=CollectorModuleConfig)
async def save_module_config(config: CollectorModuleConfig,
                             principal_service: PrincipalService = Depends(
	                             get_any_admin_principal)) -> CollectorModuleConfig:
	validate_tenant_id(config, principal_service)
	module_config_service = get_collector_module_config_service(ask_meta_storage(),
	                                                            ask_snowflake_generator(),
	                                                            principal_service)
	action = ask_save_module_config_action(module_config_service, principal_service)
	return action(config)


# noinspection PyUnusedLocal
def ask_save_module_config_action(
		module_config_service: CollectorModuleConfigService, principal_service: PrincipalService
) -> Callable[[CollectorModuleConfig], CollectorModuleConfig]:
	def action(config: CollectorModuleConfig) -> CollectorModuleConfig:
		if module_config_service.is_storable_id_faked(config.moduleId):
			module_config_service.redress_storable_id(config)
			# noinspection PyTypeChecker
			config: CollectorModuleConfig = module_config_service.create_module_config(config)
		else:
			# noinspection PyTypeChecker
			existing_module_config: Optional[CollectorModuleConfig] = \
				module_config_service.find_by_module_id(config.moduleId)
			if existing_module_config is not None:
				if existing_module_config.tenantId != config.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			config: CollectorModuleConfig = \
				module_config_service.update_module_config(config)

		return config

	return action


@router.get('/collector/json/template/all', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
            response_model=List[Dict])
async def create_json_template(principal_service: PrincipalService = Depends(get_any_admin_principal)) -> List[Dict]:
	collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	data_capture_service = DataCaptureService(ask_meta_storage(),
	                                          ask_snowflake_generator(),
	                                          principal_service)
	models = collector_model_config_service.find_by_tenant(principal_service.tenantId)
	results = []
	for model in models:
		table_config = collector_table_config_service.find_root_table_config(model.modelName, model.tenantId)
		if table_config:
			json_data = data_capture_service.build_json_template(table_config[0])
			results.append({"topicCode": model.rawTopicCode, "data": json_data})
	return results


@router.get('/collector/json/template/model', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
            response_model=Dict)
async def create_json_template(model_name: str, principal_service: PrincipalService = Depends(get_any_admin_principal)) -> Dict:
	collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
	                                                                    ask_snowflake_generator(),
	                                                                    principal_service)
	data_capture_service = DataCaptureService(ask_meta_storage(),
	                                          ask_snowflake_generator(),
	                                          principal_service)
	model = collector_model_config_service.find_by_name(model_name, principal_service.tenantId)

	table_config = collector_table_config_service.find_root_table_config(model.modelName, model.tenantId)
	if table_config:
		json_data = data_capture_service.build_json_template(table_config[0])
		return {"topicCode": model.rawTopicCode, "data": json_data}
