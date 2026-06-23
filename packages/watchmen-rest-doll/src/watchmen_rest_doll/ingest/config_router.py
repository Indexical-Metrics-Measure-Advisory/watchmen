from typing import Callable, Optional, Dict, List

import yaml
from fastapi import APIRouter, Depends, Body, Request, Response
from watchmen_collector_kernel.service import DataCaptureService, parse_from_instance_json, \
    get_collector_data_source_service, ask_datasource_by_param_name

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_collector_kernel.model import CollectorTableConfig, CollectorModelConfig, CollectorModuleConfig
from watchmen_collector_kernel.storage import get_collector_model_config_service, CollectorModelConfigService, \
    get_collector_table_config_service, CollectorTableConfigService, get_collector_module_config_service, \
    CollectorModuleConfigService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole, Topic, TopicKind, TopicType
from watchmen_model.common import Pageable, DataPage, TenantId
from watchmen_model.system import DataSource
from watchmen_rest import get_any_admin_principal, get_console_principal
from watchmen_rest.util import validate_tenant_id, raise_403, raise_400, raise_404
from watchmen_rest_doll.admin import ask_save_topic_action
from watchmen_rest_doll.util import trans_readonly, trans_with_tail
from watchmen_utilities import is_blank, is_not_blank

router = APIRouter()


def ensure_design_environment_for_yaml_update() -> None:
    if not ask_replace_topic_to_storage() and not ask_sync_topic_to_storage():
        raise_400('Current environment is runtime. YAML update is allowed only in design environment.')


@router.get('/ingest/table/config', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_table_config_by_id(
        table_config_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_any_admin_principal)
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


@router.get('/ingest/table/config/yaml/agent-view', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
@router.get('/ingest/table/config/yaml', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_table_config_yaml_by_id(
        table_config_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    if is_blank(table_config_id):
        raise_400('collector table config id is required.')

    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)

    table_config: CollectorTableConfig = collector_table_config_service.find_config_by_id(table_config_id)
    if table_config is None:
        raise_404()
    if table_config.tenantId != principal_service.get_tenant_id():
        raise_404()
    yaml_str = yaml.dump(table_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.get('/ingest/config/table/all', tags=[UserRole.ADMIN],response_model=None)
async def load_table_config_list(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[CollectorTableConfig]:

    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)

    def action() -> List[CollectorTableConfig]:
        # noinspection PyTypeChecker
        table_config_list:  List[CollectorTableConfig] = collector_table_config_service.find_all(principal_service.tenantId)

        return table_config_list

    return trans_readonly(collector_table_config_service,action)


class QueryTableConfigDataPage(DataPage):
    data: List[CollectorTableConfig]


@router.get('/ingest/table/config/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
@router.get('/ingest/config/table/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
async def load_table_config_list_yaml_agent_view(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    configs = await load_table_config_list(principal_service)
    yaml_str = yaml.dump([c.model_dump(mode='json', by_alias=True, exclude_none=True) for c in configs], sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.get('/ingest/table/config/name/yaml/agent-view', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_table_config_yaml_by_name(
        query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
    if is_blank(query_name):
        raise_400('collector table config name is required.')
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    table_config = collector_table_config_service.find_by_name(query_name, principal_service.get_tenant_id())
    if table_config is None:
        raise_404()
    yaml_str = yaml.dump(table_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.post('/ingest/table/config/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
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


@router.post('/ingest/table/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=None)
async def save_table_config(
        config: CollectorTableConfig, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> CollectorTableConfig:
    validate_tenant_id(config, principal_service)
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    print(config)
    action = ask_save_table_config_action(collector_table_config_service, principal_service)
    result=  action(config)
    print(result)
    return result


@router.post('/ingest/table/config/yaml/agent-upsert', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
@router.post('/ingest/table/config/yaml', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def save_table_config_yaml(
        request: Request, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    ensure_design_environment_for_yaml_update()
    yaml_bytes = await request.body()
    yaml_str = yaml_bytes.decode('utf-8')
    try:
        config_dict = yaml.safe_load(yaml_str)
        config = CollectorTableConfig.model_validate(config_dict)
    except Exception as e:
        raise_400(f'Invalid YAML: {str(e)}')

    validate_tenant_id(config, principal_service)
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    if is_blank(config.configId) and is_not_blank(config.name):
        existing_config = collector_table_config_service.find_by_name(config.name, principal_service.get_tenant_id())
        if existing_config is not None:
            config.configId = existing_config.configId
            config.version = existing_config.version
    action = ask_save_table_config_action(collector_table_config_service, principal_service)
    saved_config = action(config)
    saved_yaml_str = yaml.dump(saved_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=saved_yaml_str, media_type='application/x-yaml')


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


@router.post('/ingest/config/model/', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
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


@router.get('/ingest/model/config/yaml/agent-view', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
@router.get('/ingest/model/config/yaml', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_model_config_yaml_by_id(
        model_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
    if is_blank(model_id):
        raise_400('collector model config id is required.')

    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)

    model_config: CollectorModelConfig = collector_model_config_service.find_by_model_id(model_id)
    if model_config is None:
        raise_404()
    if model_config.tenantId != principal_service.get_tenant_id():
        raise_404()
    yaml_str = yaml.dump(model_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.post('/ingest/model/config/yaml/agent-upsert', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
@router.post('/ingest/model/config/yaml', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def save_model_config_yaml(
        request: Request, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    ensure_design_environment_for_yaml_update()
    yaml_bytes = await request.body()
    yaml_str = yaml_bytes.decode('utf-8')
    try:
        config_dict = yaml.safe_load(yaml_str)
        config = CollectorModelConfig.model_validate(config_dict)
    except Exception as e:
        raise_400(f'Invalid YAML: {str(e)}')

    validate_tenant_id(config, principal_service)
    model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                              ask_snowflake_generator(),
                                                              principal_service)
    if is_blank(config.modelId) and is_not_blank(config.modelName):
        existing_config = model_config_service.find_by_name(config.modelName, principal_service.get_tenant_id())
        if existing_config is not None:
            config.modelId = existing_config.modelId
            config.version = existing_config.version
    action = ask_save_model_config_action(model_config_service, principal_service)
    saved_config = action(config)
    saved_yaml_str = yaml.dump(saved_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=saved_yaml_str, media_type='application/x-yaml')


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


@router.post('/ingest/module/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=None)
async def save_module_config(config: CollectorModuleConfig,
                             principal_service: PrincipalService = Depends(
                                 get_any_admin_principal)) -> CollectorModuleConfig:
    validate_tenant_id(config, principal_service)
    module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                ask_snowflake_generator(),
                                                                principal_service)
    action = ask_save_module_config_action(module_config_service, principal_service)
    return action(config)


@router.get('/ingest/module/config/yaml/agent-view', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
@router.get('/ingest/module/config/yaml', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_module_config_yaml_by_id(
        module_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
    if is_blank(module_id):
        raise_400('collector module config id is required.')

    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)

    module_config: CollectorModuleConfig = collector_module_config_service.find_by_module_id(module_id)
    if module_config is None:
        raise_404()
    if module_config.tenantId != principal_service.get_tenant_id():
        raise_404()
    yaml_str = yaml.dump(module_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.post('/ingest/module/config/yaml/agent-upsert', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
@router.post('/ingest/module/config/yaml', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def save_module_config_yaml(
        request: Request, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    ensure_design_environment_for_yaml_update()
    yaml_bytes = await request.body()
    yaml_str = yaml_bytes.decode('utf-8')
    try:
        config_dict = yaml.safe_load(yaml_str)
        config = CollectorModuleConfig.model_validate(config_dict)
    except Exception as e:
        raise_400(f'Invalid YAML: {str(e)}')

    validate_tenant_id(config, principal_service)
    module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                ask_snowflake_generator(),
                                                                principal_service)
    if is_blank(config.moduleId) and is_not_blank(config.moduleName):
        existing_configs = trans_readonly(
            module_config_service, lambda: module_config_service.find_all(principal_service.get_tenant_id()))
        existing_config = next((c for c in existing_configs if c.moduleName == config.moduleName), None)
        if existing_config is not None:
            config.moduleId = existing_config.moduleId
            config.version = existing_config.version
    action = ask_save_module_config_action(module_config_service, principal_service)
    saved_config = action(config)
    saved_yaml_str = yaml.dump(saved_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=saved_yaml_str, media_type='application/x-yaml')


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
            config: CollectorModuleConfig = module_config_service.update_module_config(config)

        return config

    return action


@router.get('/ingest/json/template/all', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
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
            json_data = data_capture_service.build_json_template(table_config)
            results.append({"topicCode": model.rawTopicCode, "data": json_data})
    return results


@router.get('/ingest/json/template/model', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
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
        json_data = data_capture_service.build_json_template(table_config)
        return {"topicCode": model.rawTopicCode, "data": json_data}


# ==================== MODEL QUERY SERVICES ====================

@router.get('/ingest/model/config', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_model_config_by_id(
        model_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> CollectorModelConfig:
    if is_blank(model_id):
        raise_400('collector model config id is required.')
    
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                       ask_snowflake_generator(),
                                                                       principal_service)
    
    def action() -> CollectorModelConfig:
        # noinspection PyTypeChecker
        model_config: CollectorModelConfig = collector_model_config_service.find_by_model_id(model_id)
        if model_config is None:
            raise_404()
        # tenant id must match current principal's
        if model_config.tenantId != principal_service.get_tenant_id():
            raise_404()
        return model_config
    
    return action()


class QueryModelConfigDataPage(DataPage):
    data: List[CollectorModelConfig]


@router.post('/ingest/model/config/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_models_page_by_name(
        query_name: Optional[str], pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryModelConfigDataPage:
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                       ask_snowflake_generator(),
                                                                       principal_service)
    def action() -> QueryModelConfigDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        if is_blank(query_name):
            # noinspection PyTypeChecker
            return collector_model_config_service.find_page_by_text(None, tenant_id, pageable)
        else:
            # noinspection PyTypeChecker
            return collector_model_config_service.find_page_by_text(query_name, tenant_id, pageable)
    
    return action()


@router.get('/ingest/model/config/name/yaml/agent-view', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_model_config_yaml_by_name(
        query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
    if is_blank(query_name):
        raise_400('collector model config name is required.')
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    model_config = collector_model_config_service.find_by_name(query_name, principal_service.get_tenant_id())
    if model_config is None:
        raise_404()
    yaml_str = yaml.dump(model_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.post('/ingest/model/config/search', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_models_page_with_filters(
        filters: Dict = Body(...), pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryModelConfigDataPage:
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                       ask_snowflake_generator(),
                                                                       principal_service)
    def action() -> QueryModelConfigDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        # noinspection PyTypeChecker
        return collector_model_config_service.find_page_by_filters(filters, tenant_id, pageable)
    
    return action()


@router.get('/ingest/model/config/with-tables', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_model_config_with_related_tables(
        model_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Dict:
    if is_blank(model_id):
        raise_400('collector model config id is required.')
    
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                       ask_snowflake_generator(),
                                                                       principal_service)
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    
    def action() -> Dict:
        # noinspection PyTypeChecker
        model_config: CollectorModelConfig = collector_model_config_service.find_by_model_id(model_id)
        if model_config is None:
            raise_404()
        # tenant id must match current principal's
        if model_config.tenantId != principal_service.get_tenant_id():
            raise_404()
        
        # Load related table configs
        related_tables = collector_table_config_service.find_by_model_name(model_config.modelName, model_config.tenantId)
        
        return {
            "model": model_config,
            "relatedTables": related_tables
        }
    
    return action()


@router.get('/ingest/config/model/all', tags=[UserRole.ADMIN])
async def load_model_config_list(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[CollectorModelConfig]:
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)

    def action() -> List[CollectorModelConfig]:
        # noinspection PyTypeChecker
        model_config_list:  List[CollectorModelConfig] = collector_model_config_service.find_all(principal_service.tenantId)
        return model_config_list

    return trans_readonly(collector_model_config_service,action)


@router.get('/ingest/model/config/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
@router.get('/ingest/config/model/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
async def load_model_config_list_yaml_agent_view(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    configs = await load_model_config_list(principal_service)
    yaml_str = yaml.dump([c.model_dump(mode='json', by_alias=True, exclude_none=True) for c in configs], sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.get('/ingest/model/config/stats', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def get_model_config_statistics(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> Dict:
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                       ask_snowflake_generator(),
                                                                       principal_service)
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    
    def action() -> Dict:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # Get basic statistics
        total_models = collector_model_config_service.count_by_tenant(tenant_id)
        active_models = collector_model_config_service.count_active_by_tenant(tenant_id)
        
        # Get models with table counts
        models_with_table_counts = collector_model_config_service.get_models_with_table_counts(tenant_id)
        
        return {
            "totalModels": total_models,
            "activeModels": active_models,
            "modelsWithTableCounts": models_with_table_counts
        }
    
    return action()


# ==================== MODULE QUERY SERVICES ====================

@router.get('/ingest/module/config', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_module_config_by_id(
        module_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> CollectorModuleConfig:
    if is_blank(module_id):
        raise_400('collector module config id is required.')
    
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    
    def action() -> CollectorModuleConfig:
        # noinspection PyTypeChecker
        module_config: CollectorModuleConfig = collector_module_config_service.find_by_module_id(module_id)
        if module_config is None:
            raise_404()
        # tenant id must match current principal's
        if module_config.tenantId != principal_service.get_tenant_id():
            raise_404()
        return module_config
    
    return action()


class QueryModuleConfigDataPage(DataPage):
    data: List[CollectorModuleConfig]


@router.get('/ingest/module/config/name/yaml/agent-view', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_module_config_yaml_by_name(
        query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
    if is_blank(query_name):
        raise_400('collector module config name is required.')
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    module_configs = trans_readonly(
        collector_module_config_service,
        lambda: collector_module_config_service.find_all(principal_service.get_tenant_id()))
    module_config = next((c for c in module_configs if c.moduleName == query_name), None)
    if module_config is None:
        raise_404()
    yaml_str = yaml.dump(module_config.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.post('/ingest/module/config/search', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_modules_page_with_multiple_conditions(
        conditions: Dict = Body(...), pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryModuleConfigDataPage:
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    def action() -> QueryModuleConfigDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        # noinspection PyTypeChecker
        return collector_module_config_service.find_page_by_conditions(conditions, tenant_id, pageable)
    
    return action()


@router.get('/ingest/module/config/tree', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_module_config_tree(
        parent_module_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Dict]:
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    
    def action() -> List[Dict]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(parent_module_id):
            # Load root modules
            root_modules = collector_module_config_service.find_root_modules(tenant_id)
        else:
            # Load child modules
            root_modules = collector_module_config_service.find_child_modules(parent_module_id, tenant_id)
        
        # Build tree structure
        tree_data = []
        for module in root_modules:
            children = collector_module_config_service.find_child_modules(module.moduleId, tenant_id)
            tree_data.append({
                "module": module,
                "children": children,
                "hasChildren": len(children) > 0
            })
        
        return tree_data
    
    return action()


@router.get('/ingest/config/module/all', tags=[UserRole.ADMIN])
async def load_module_config_list(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[CollectorModuleConfig]:
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)

    def action() -> List[CollectorModuleConfig]:
        # noinspection PyTypeChecker
        module_config_list:  List[CollectorModuleConfig] = collector_module_config_service.find_all(principal_service.tenantId)
        return module_config_list

    return trans_readonly(collector_module_config_service,action)

@router.get('/ingest/module/config/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
@router.get('/ingest/config/module/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
async def load_module_config_list_yaml_agent_view(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Response:
    configs = await load_module_config_list(principal_service)
    yaml_str = yaml.dump([c.model_dump(mode='json', by_alias=True, exclude_none=True) for c in configs], sort_keys=False)
    return Response(content=yaml_str, media_type='application/x-yaml')


@router.get('/ingest/module/config/hierarchy', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_module_config_hierarchy(
        module_id: Optional[str] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Dict:
    if is_blank(module_id):
        raise_400('collector module config id is required.')
    
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    
    def action() -> Dict:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # noinspection PyTypeChecker
        module_config: CollectorModuleConfig = collector_module_config_service.find_by_module_id(module_id)
        if module_config is None:
            raise_404()
        if module_config.tenantId != tenant_id:
            raise_404()
        
        # Get parent hierarchy
        parents = collector_module_config_service.find_parent_hierarchy(module_id, tenant_id)
        
        # Get children
        children = collector_module_config_service.find_child_modules(module_id, tenant_id)
        
        # Get siblings
        siblings = collector_module_config_service.find_sibling_modules(module_id, tenant_id)
        
        return {
            "module": module_config,
            "parents": parents,
            "children": children,
            "siblings": siblings
        }
    
    return action()


@router.post('/ingest/module/config/batch', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_modules_batch(
        module_ids: List[str] = Body(...), principal_service: PrincipalService = Depends(get_console_principal)
) -> List[CollectorModuleConfig]:
    if not module_ids or len(module_ids) == 0:
        raise_400('module ids are required.')
    
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    
    def action() -> List[CollectorModuleConfig]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        # noinspection PyTypeChecker
        modules = collector_module_config_service.find_by_module_ids(module_ids, tenant_id)
        
        # Filter out modules that don't belong to current tenant
        filtered_modules = [module for module in modules if module.tenantId == tenant_id]
        
        return filtered_modules
    
    return action()


@router.post('/ingest/module/config/batch/update', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def update_modules_batch(
        updates: List[Dict] = Body(...), principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[CollectorModuleConfig]:
    if not updates or len(updates) == 0:
        raise_400('update data is required.')
    
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          principal_service)
    
    def action() -> List[CollectorModuleConfig]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        updated_modules = []
        
        for update_data in updates:
            module_id = update_data.get('moduleId')
            if is_blank(module_id):
                continue
            
            # noinspection PyTypeChecker
            existing_module: Optional[CollectorModuleConfig] = \
                collector_module_config_service.find_by_module_id(module_id)
            
            if existing_module is not None and existing_module.tenantId == tenant_id:
                # Apply updates
                for key, value in update_data.items():
                    if hasattr(existing_module, key) and key != 'moduleId' and key != 'tenantId':
                        setattr(existing_module, key, value)
                
                # noinspection PyTypeChecker
                updated_module = collector_module_config_service.update_module_config(existing_module)
                updated_modules.append(updated_module)
        
        return updated_modules
    
    return action()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def create_initial_topic(name: str) -> Topic:

    return Topic(
        topicId=None,
        name=name,
        kind=TopicKind.BUSINESS,
        type=TopicType.RAW,
        factors=[]
    )


@router.get('/collector/create/raw/topic', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=None)
async def create_raw_topic(model_name: str, principal_service: PrincipalService = Depends(get_any_admin_principal)) -> Optional[Topic]:
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)
    data_capture_service = DataCaptureService(ask_meta_storage(),
                                              ask_snowflake_generator(),
                                              principal_service)
    topic_service = get_topic_service(principal_service)
    model = collector_model_config_service.find_by_name(model_name, principal_service.tenantId)
    table_config = collector_table_config_service.find_root_table_config(model.modelName, model.tenantId)
    if table_config:
        json_data = data_capture_service.build_json_template(table_config)
        topic_service.begin_transaction()
        try:
            existed_topic = topic_service.find_by_name_and_tenant(model.rawTopicCode, principal_service.tenantId)
        finally:
            topic_service.close_transaction()

        if existed_topic is None:
            existed_topic = create_initial_topic(model.rawTopicCode)
            validate_tenant_id(existed_topic, principal_service)
            data_source: DataSource = ask_datasource_by_param_name(principal_service.tenantId,
                                                                   principal_service,
                                                                   "datadb")
            if data_source is None:
                raise RuntimeError('datasource not found')
            else:
                existed_topic.dataSourceId = data_source.dataSourceId
        updated_topic = parse_from_instance_json(existed_topic, [json_data])
        action = ask_save_topic_action(topic_service, principal_service)
        return trans_with_tail(topic_service, lambda: action(updated_topic))
    
    return None




