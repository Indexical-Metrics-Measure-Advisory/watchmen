from fastapi import APIRouter
from fastapi import Depends, Body
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_utilities import is_blank
from watchmen_metricflow.cache.metric_config_cache import metric_config_cache

router = APIRouter()



def get_semantic_model_service(principal_service: PrincipalService) -> SemanticModelService:
    return SemanticModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class QuerySemanticModelDataPage(DataPage):
    data: List[SemanticModel]


@router.get('/metricflow/semantic-model/{model_name}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_model_by_name(
        model_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> SemanticModel:
    """Get a specific semantic model by name"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> SemanticModel:
        tenant_id: TenantId = principal_service.get_tenant_id()
        semantic_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if semantic_model is None:
            raise_404()
        return semantic_model
    
    return trans_readonly(semantic_model_service, action)


@router.post('/metricflow/semantic-model', tags=['ADMIN'], response_model=None)
async def create_semantic_model(
        semantic_model: SemanticModel,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> SemanticModel:
    """Create a new semantic model"""
    if is_blank(semantic_model.name):
        raise_400('Semantic model name is required.')
    
    # Set tenant ID from principal
    semantic_model.tenantId = principal_service.tenantId
    
    semantic_model_service = get_semantic_model_service(principal_service)
    semantic_model.id = str(semantic_model_service.snowflakeGenerator.next_id())
    
    def action() -> SemanticModel:
        # Check if semantic model with same name already exists
        existing_model = semantic_model_service.find_by_name(semantic_model.name, semantic_model.tenantId)
        if existing_model:
            raise_400(f'Semantic model with name "{semantic_model.name}" already exists.')
        
        model_result = semantic_model_service.create(semantic_model)
        metric_config_cache.remove(semantic_model.tenantId)
        return model_result
    
    return trans(semantic_model_service, action)


@router.put('/metricflow/semantic-model/{model_name}', tags=['ADMIN'], response_model=None)
async def update_semantic_model(
        model_name: str,
        semantic_model: SemanticModel,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> SemanticModel:
    """Update an existing semantic model"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    # Set tenant ID from principal
    semantic_model.tenantId = principal_service.get_tenant_id()
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> SemanticModel:
        # Check if semantic model exists
        existing_model = semantic_model_service.find_by_name(model_name, semantic_model.tenantId)
        if existing_model is None:
            raise_404('Semantic model not found.')

        semantic_model.id = existing_model.id
        model_result = semantic_model_service.update(semantic_model)
        metric_config_cache.remove(semantic_model.tenantId)
        return model_result
    
    return trans(semantic_model_service, action)


@router.delete('/metricflow/semantic-model/{model_name}', tags=['ADMIN'], response_model=None)
async def delete_semantic_model(
        model_name: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> SemanticModel:
    """Delete a semantic model"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')
    
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> SemanticModel:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # Check if semantic model exists
        existing_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if existing_model is None:
            raise_404('Semantic model not found.')
        
        semantic_model_service.delete_by_name(model_name, tenant_id)
        metric_config_cache.remove(tenant_id)
        return existing_model
    
    return trans(semantic_model_service, action)


@router.get('/metricflow/semantic-models/by-description/{description}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_models_by_description(
        description: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[SemanticModel]:
    """Get all semantic models with description containing the specified text"""
    if is_blank(description):
        raise_400('Description is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[SemanticModel]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return semantic_model_service.find_by_description_like(description, tenant_id)
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-models/by-primary-entity/{primary_entity}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_models_by_primary_entity(
        primary_entity: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[SemanticModel]:
    """Get all semantic models with a specific primary entity"""
    if is_blank(primary_entity):
        raise_400('Primary entity is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[SemanticModel]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return semantic_model_service.find_by_primary_entity(primary_entity, tenant_id)
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-models/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_semantic_models(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[SemanticModel]:
    """Get all semantic models"""
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[SemanticModel]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return semantic_model_service.find_all(tenant_id)
    
    return trans_readonly(semantic_model_service, action)


@router.post('/metricflow/semantic-models/name', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def find_semantic_models_page_by_name(
        query_name: Optional[str], 
        pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QuerySemanticModelDataPage:
    """Find semantic models by name with pagination"""
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> QuerySemanticModelDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(query_name):
            semantic_models = semantic_model_service.find_all(tenant_id)
        else:
            # For partial name matching, we'll get all semantic models and filter
            all_models = semantic_model_service.find_all(tenant_id)
            semantic_models = [m for m in all_models if query_name.lower() in m.name.lower()]
        
        # Simple pagination simulation
        start = (pageable.pageNumber - 1) * pageable.pageSize
        end = start + pageable.pageSize
        page_data = semantic_models[start:end] if start < len(semantic_models) else []
        
        return QuerySemanticModelDataPage(
            data=page_data,
            itemCount=len(page_data),
            pageNumber=pageable.pageNumber,
            pageSize=pageable.pageSize,
            pageCount=(len(semantic_models) + pageable.pageSize - 1) // pageable.pageSize
        )
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-models/list/name', tags=['ADMIN'], response_model=None)
async def find_semantic_models_by_name(
        query_name: Optional[str],
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[SemanticModel]:
    """Find semantic models by name"""
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[SemanticModel]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(query_name):
            return semantic_model_service.find_all(tenant_id)
        else:
            # For partial name matching, we'll get all semantic models and filter
            all_models = semantic_model_service.find_all(tenant_id)
            return [m for m in all_models if query_name.lower() in m.name.lower()]
    
    return trans_readonly(semantic_model_service, action)


# Additional endpoints specific to semantic models

@router.get('/metricflow/semantic-model/{model_name}/entities', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_model_entities(
        model_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[dict]:
    """Get all entities from a specific semantic model"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[dict]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        semantic_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if semantic_model is None:
            raise_404('Semantic model not found.')
        
        return [entity.model_dump() for entity in semantic_model.entities]
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-model/{model_name}/measures', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_model_measures(
        model_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[dict]:
    """Get all measures from a specific semantic model"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[dict]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        semantic_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if semantic_model is None:
            raise_404('Semantic model not found.')
        
        return [measure.model_dump() for measure in semantic_model.measures]
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-model/{model_name}/dimensions', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_model_dimensions(
        model_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[dict]:
    """Get all dimensions from a specific semantic model"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[dict]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        semantic_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if semantic_model is None:
            raise_404('Semantic model not found.')
        
        return [dimension.model_dump() for dimension in semantic_model.dimensions]
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-model/{model_name}/time-dimensions', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_model_time_dimensions(
        model_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[dict]:
    """Get all time dimensions from a specific semantic model"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[dict]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        semantic_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if semantic_model is None:
            raise_404('Semantic model not found.')
        
        time_dimensions = semantic_model.get_time_dimensions()
        return [dimension.model_dump() for dimension in time_dimensions]
    
    return trans_readonly(semantic_model_service, action)


@router.get('/metricflow/semantic-model/{model_name}/categorical-dimensions', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_semantic_model_categorical_dimensions(
        model_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[dict]:
    """Get all categorical dimensions from a specific semantic model"""
    if is_blank(model_name):
        raise_400('Semantic model name is required.')
    
    semantic_model_service = get_semantic_model_service(principal_service)
    
    def action() -> List[dict]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        semantic_model = semantic_model_service.find_by_name(model_name, tenant_id)
        if semantic_model is None:
            raise_404('Semantic model not found.')
        
        categorical_dimensions = semantic_model.get_categorical_dimensions()
        return [dimension.model_dump() for dimension in categorical_dimensions]
    
    return trans_readonly(semantic_model_service, action)