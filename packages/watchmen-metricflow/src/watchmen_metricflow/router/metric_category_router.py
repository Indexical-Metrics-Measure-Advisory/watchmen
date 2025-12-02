from typing import List, Optional

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.metric_category_meta_service import CategoryService
from watchmen_metricflow.model.metric_category import Category
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_category_service(principal_service: PrincipalService) -> CategoryService:
    return CategoryService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/metric/category/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_categories(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Category]:
    """Get all metric categories"""
    category_service = get_category_service(principal_service)

    def action() -> List[Category]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return category_service.find_all(tenant_id)

    return trans_readonly(category_service, action)


@router.get('/metric/category/{name}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_category_by_name(
        name: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> Category:
    """Get a specific metric category by name"""
    if is_blank(name):
        raise_400('Category name is required.')

    category_service = get_category_service(principal_service)

    def action() -> Category:
        tenant_id: TenantId = principal_service.get_tenant_id()
        category = category_service.find_by_name(name, tenant_id)
        if category is None:
            raise_404()
        return category

    return trans_readonly(category_service, action)


@router.post('/metric/category', tags=['ADMIN'], response_model=None)
async def create_category(
        category: Category,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> Category:
    """Create a new metric category"""
    if is_blank(category.name):
        raise_400('Category name is required.')

    # Set tenant ID from principal
    category.tenantId = principal_service.get_tenant_id()

    category_service = get_category_service(principal_service)
    category.id = str(category_service.snowflakeGenerator.next_id())

    def action() -> Category:
        # Check if category with same name already exists
        existing_category = category_service.find_by_name(category.name, category.tenantId)
        if existing_category:
            raise_400(f'Category with name "{category.name}" already exists.')

        return category_service.create(category)

    return trans(category_service, action)


@router.put('/metric/category/{name}', tags=['ADMIN'], response_model=None)
async def update_category(
        name: str,
        category: Category,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> Category:
    """Update an existing metric category"""
    if is_blank(name):
        raise_400('Category name is required.')

    # Set tenant ID from principal
    category.tenantId = principal_service.get_tenant_id()

    category_service = get_category_service(principal_service)

    def action() -> Category:
        # Check if category exists
        existing_category = category_service.find_by_name(name, category.tenantId)
        if existing_category is None:
            raise_404('Category not found.')
        category.id = existing_category.id
        return category_service.update(category)

    return trans(category_service, action)


@router.delete('/metric/category/{name}', tags=['ADMIN'], response_model=None)
async def delete_category(
        name: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> Category:
    """Delete a metric category"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')

    if is_blank(name):
        raise_400('Category name is required.')

    category_service = get_category_service(principal_service)

    def action() -> Category:
        tenant_id: TenantId = principal_service.get_tenant_id()

        # Check if category exists
        existing_category = category_service.find_by_name(name, tenant_id)
        if existing_category is None:
            raise_404('Category not found.')

        return category_service.delete_by_name(name, tenant_id)

    return trans(category_service, action)
