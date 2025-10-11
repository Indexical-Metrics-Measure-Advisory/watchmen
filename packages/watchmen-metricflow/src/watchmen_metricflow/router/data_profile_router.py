from fastapi import APIRouter
from fastapi import Depends, Body
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.data_profile_meta_service import DataProfileService
from watchmen_metricflow.model.data_profile import DataProfile
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_data_profile_service(principal_service: PrincipalService) -> DataProfileService:
    return DataProfileService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class QueryDataProfileDataPage(DataPage):
    data: List[DataProfile]


@router.get('/profile/{profile_name}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_data_profile_by_name(
        profile_name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> DataProfile:
    """Get a specific data profile by name"""
    if is_blank(profile_name):
        raise_400('Data profile name is required.')
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        tenant_id: TenantId = principal_service.get_tenant_id()
        data_profile = data_profile_service.find_by_name(profile_name, tenant_id)
        if data_profile is None:
            raise_404()
        return data_profile
    
    return trans_readonly(data_profile_service, action)


@router.post('/profile', tags=['ADMIN'], response_model=None)
async def create_data_profile(
        data_profile: DataProfile,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProfile:
    """Create a new data profile"""
    if is_blank(data_profile.name):
        raise_400('Data profile name is required.')
    
    # Set tenant ID from principal
    data_profile.tenantId = principal_service.tenantId
    
    data_profile_service = get_data_profile_service(principal_service)
    data_profile.id = str(data_profile_service.snowflakeGenerator.next_id())
    
    def action() -> DataProfile:
        # Check if data profile with same name already exists
        existing_profile = data_profile_service.find_by_name(data_profile.name, data_profile.tenantId)
        if existing_profile:
            raise_400(f'Data profile with name "{data_profile.name}" already exists.')
        
        return data_profile_service.create(data_profile)
    
    return trans(data_profile_service, action)


@router.put('/data-profile/{profile_name}', tags=['ADMIN'], response_model=None)
async def update_data_profile(
        profile_name: str,
        data_profile: DataProfile,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProfile:
    """Update an existing data profile"""
    if is_blank(profile_name):
        raise_400('Data profile name is required.')
    
    # Set tenant ID from principal
    data_profile.tenantId = principal_service.get_tenant_id()
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        # Check if data profile exists
        existing_profile = data_profile_service.find_by_name(profile_name, data_profile.tenantId)
        if existing_profile is None:
            raise_404('Data profile not found.')
        data_profile.id = existing_profile.id
        return data_profile_service.update(data_profile)
    
    return trans(data_profile_service, action)


@router.delete('/data-profile/{profile_name}', tags=['ADMIN'], response_model=None)
async def delete_data_profile(
        profile_name: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProfile:
    """Delete a data profile"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')
    
    if is_blank(profile_name):
        raise_400('Data profile name is required.')
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # Check if data profile exists
        existing_profile = data_profile_service.find_by_name(profile_name, tenant_id)
        if existing_profile is None:
            raise_404('Data profile not found.')
        
        data_profile_service.delete_by_name(profile_name, tenant_id)
        return existing_profile
    
    return trans(data_profile_service, action)


@router.get('/data-profiles/by-target/{target}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_data_profiles_by_target(
        target: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[DataProfile]:
    """Get all data profiles for a specific target"""
    if is_blank(target):
        raise_400('Target is required.')
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> List[DataProfile]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return data_profile_service.find_by_target(target, tenant_id)
    
    return trans_readonly(data_profile_service, action)


@router.get('/profile', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_data_profile_by_tenant(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> DataProfile:
    """Get the data profile for current tenant (each tenant should only have one)"""
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        tenant_id: TenantId = principal_service.get_tenant_id()
        profiles = data_profile_service.find_all(tenant_id)
        
        if not profiles:
            return None
        
        # Since each tenant should only have one data profile, return the first one
        # In case there are multiple (which shouldn't happen), we return the first one
        return profiles[0]
    
    return trans_readonly(data_profile_service, action)


@router.get('/data-profiles/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_data_profiles(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[DataProfile]:
    """Get all data profiles"""
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> List[DataProfile]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return data_profile_service.find_all(tenant_id)
    
    return trans_readonly(data_profile_service, action)


@router.post('/data-profiles/name', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def find_data_profiles_page_by_name(
        query_name: Optional[str], 
        pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryDataProfileDataPage:
    """Find data profiles by name with pagination"""
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> QueryDataProfileDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(query_name):
            profiles = data_profile_service.find_all(tenant_id)
        else:
            # For partial name matching, we'll get all profiles and filter
            all_profiles = data_profile_service.find_all(tenant_id)
            profiles = [p for p in all_profiles if query_name.lower() in p.name.lower()]
        
        # Simple pagination simulation
        start = (pageable.pageNumber - 1) * pageable.pageSize
        end = start + pageable.pageSize
        page_data = profiles[start:end] if start < len(profiles) else []
        
        return QueryDataProfileDataPage(
            data=page_data,
            itemCount=len(page_data),
            pageNumber=pageable.pageNumber,
            pageSize=pageable.pageSize,
            pageCount=(len(profiles) + pageable.pageSize - 1) // pageable.pageSize
        )
    
    return trans_readonly(data_profile_service, action)


@router.get('/data-profiles/list/name', tags=['ADMIN'], response_model=None)
async def find_data_profiles_by_name(
        query_name: Optional[str],
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[DataProfile]:
    """Find data profiles by name"""
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> List[DataProfile]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        if is_blank(query_name):
            return data_profile_service.find_all(tenant_id)
        else:
            # For partial name matching, we'll get all profiles and filter
            all_profiles = data_profile_service.find_all(tenant_id)
            return [p for p in all_profiles if query_name.lower() in p.name.lower()]
    
    return trans_readonly(data_profile_service, action)


@router.get('/data-profile/id/{profile_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_data_profile_by_id(
        profile_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> DataProfile:
    """Get a specific data profile by ID"""
    if is_blank(profile_id):
        raise_400('Data profile ID is required.')
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        tenant_id: TenantId = principal_service.get_tenant_id()
        data_profile = data_profile_service.find_by_id(profile_id, tenant_id)
        if data_profile is None:
            raise_404()
        return data_profile
    
    return trans_readonly(data_profile_service, action)


@router.put('/data-profile/id/{profile_id}', tags=['ADMIN'], response_model=None)
async def update_data_profile_by_id(
        profile_id: str,
        data_profile: DataProfile,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProfile:
    """Update an existing data profile by ID"""
    if is_blank(profile_id):
        raise_400('Data profile ID is required.')
    
    # Set tenant ID from principal
    data_profile.tenantId = principal_service.get_tenant_id()
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        # Check if data profile exists
        existing_profile = data_profile_service.find_by_id(profile_id, data_profile.tenantId)
        if existing_profile is None:
            raise_404('Data profile not found.')
        data_profile.id = profile_id
        return data_profile_service.update(data_profile)
    
    return trans(data_profile_service, action)


@router.delete('/data-profile/id/{profile_id}', tags=['ADMIN'], response_model=None)
async def delete_data_profile_by_id(
        profile_id: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProfile:
    """Delete a data profile by ID"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')
    
    if is_blank(profile_id):
        raise_400('Data profile ID is required.')
    
    data_profile_service = get_data_profile_service(principal_service)
    
    def action() -> DataProfile:
        tenant_id: TenantId = principal_service.get_tenant_id()
        
        # Check if data profile exists
        existing_profile = data_profile_service.find_by_id(profile_id, tenant_id)
        if existing_profile is None:
            raise_404('Data profile not found.')
        
        data_profile_service.delete_by_id(profile_id, tenant_id)
        return existing_profile
    
    return trans(data_profile_service, action)