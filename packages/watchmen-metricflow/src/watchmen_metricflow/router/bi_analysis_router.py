from typing import List, Optional

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIAnalysisInput
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_bi_analysis_service(principal_service: PrincipalService) -> BIAnalysisService:
    return BIAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/metricflow/bi-analysis/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_bi_analyses(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[BIAnalysis]:
    """Get all BI analyses"""
    service = get_bi_analysis_service(principal_service)

    def action() -> List[BIAnalysis]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return service.find_all_by_user_id(principal_service.userId,tenant_id)

    return trans_readonly(service, action)


@router.get('/metricflow/bi-analysis/{analysis_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_bi_analysis_by_name(
        analysis_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> BIAnalysis:
    """Get a specific BI analysis by name"""
    if is_blank(analysis_id):
        raise_400('BI analysis analysis_id is required.')

    service = get_bi_analysis_service(principal_service)

    def action() -> BIAnalysis:
        # tenant_id: TenantId = principal_service.get_tenant_id()
        analysis = service.find_by_id(analysis_id)

        #TODO add check for user access rights

        if analysis is None:
            raise_404()
        return analysis

    return trans_readonly(service, action)


@router.post('/metricflow/bi-analysis', tags=['ADMIN'], response_model=None)
async def create_bi_analysis(
        analysis: BIAnalysis,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> BIAnalysis:
    """Create a new BI analysis"""
    if is_blank(analysis.name):
        raise_400('BI analysis name is required.')

    # Set tenant ID from principal
    analysis.tenantId = principal_service.get_tenant_id()

    service = get_bi_analysis_service(principal_service)
    analysis.id = str(service.snowflakeGenerator.next_id())

    def action() -> BIAnalysis:
        # Check if analysis with same name already exists
        existing_analysis = service.find_by_name(analysis.name, analysis.tenantId)
        if existing_analysis:
            raise_400(f'BI analysis with name "{analysis.name}" already exists.')

        return service.create(analysis)

    return trans(service, action)


@router.post('/metricflow/bi-analysis/update', tags=['ADMIN'], response_model=None)
async def update_bi_analysis(
        analysis: BIAnalysis,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> BIAnalysis:
    """Update an existing BI analysis"""
    if is_blank(analysis.id):
        raise_400('BI analysis id is required.')

    # Set tenant ID from principal
    analysis.tenantId = principal_service.get_tenant_id()

    service = get_bi_analysis_service(principal_service)

    def action() -> BIAnalysis:
        # Check if analysis exists
        existing_analysis = service.find_by_id(analysis.id)
        if existing_analysis is None:
            raise_404('BI analysis not found.')
        analysis.id = existing_analysis.id
        return service.update(analysis)

    return trans(service, action)


@router.post('/metricflow/bi-analysis/update/template', tags=['ADMIN'], response_model=None)
async def update_bi_analysis(
        analysis_input: BIAnalysisInput,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> BIAnalysis:
    """Update an existing BI analysis"""
    if is_blank(analysis_input.id):
        raise_400('BI analysis id is required.')

    # Set tenant ID from principal

    service = get_bi_analysis_service(principal_service)

    def action() -> BIAnalysis:
        # Check if analysis exists
        existing_analysis :BIAnalysis = service.find_by_id(analysis_input.id)
        if existing_analysis is None:
            raise_404('BI analysis not found.')
        existing_analysis.isTemplate = analysis_input.isTemplate
        return service.update(existing_analysis)

    return trans(service, action)




@router.get('/metricflow/bi-analysis/delete/{analysis_id}', tags=['ADMIN'], response_model=None)
async def delete_bi_analysis(
        analysis_id: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> BIAnalysis:
    """Delete a BI analysis"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')

    if is_blank(analysis_id):
        raise_400('BI analysis analysis_id is required.')

    service = get_bi_analysis_service(principal_service)

    def action() -> BIAnalysis:

        # Check if analysis exists
        existing_analysis = service.find_by_id(analysis_id)
        if existing_analysis is None:
            raise_404('BI analysis not found.')

        return service.delete_by_id(analysis_id)

    return trans(service, action)
