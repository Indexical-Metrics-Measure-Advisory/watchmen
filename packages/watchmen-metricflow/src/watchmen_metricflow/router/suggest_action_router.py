from typing import List, Optional

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.suggest_action_meta_service import ActionTypeService, SuggestedActionService
from watchmen_metricflow.model.suggest_action import ActionType, SuggestedAction
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


def get_action_type_service(principal_service: PrincipalService) -> ActionTypeService:
    return ActionTypeService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_suggested_action_service(principal_service: PrincipalService) -> SuggestedActionService:
    return SuggestedActionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class ActionTypeDataPage(DataPage):
    data: List[ActionType]


class SuggestedActionDataPage(DataPage):
    data: List[SuggestedAction]


# Action Type Endpoints

@router.post('/metricflow/action-type', tags=['ADMIN'], response_model=ActionType)
async def create_action_type(
        action_type: ActionType,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> ActionType:
    if is_blank(action_type.name):
        raise_400('Action type name is required.')

    action_type_service = get_action_type_service(principal_service)

    def action() -> ActionType:
        action_type_service.begin_transaction()
        try:
            action_type.tenantId = principal_service.get_tenant_id()
            action_type.id = str(action_type_service.snowflakeGenerator.next_id())
            created_action_type = action_type_service.create(action_type)
            action_type_service.commit_transaction()
            return created_action_type
        except Exception as e:
            action_type_service.rollback_transaction()
            raise e

    return trans(action_type_service, action)


@router.post('/metricflow/action-type/update', tags=['ADMIN'], response_model=ActionType)
async def update_action_type(
        action_type: ActionType,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> ActionType:
    if is_blank(action_type.id):
        raise_400('Action type ID is required.')

    action_type_service = get_action_type_service(principal_service)

    def action() -> ActionType:
        action_type_service.begin_transaction()
        try:
            action_type.tenantId = principal_service.get_tenant_id()
            existing_action_type = action_type_service.find_by_id(action_type.id)
            if existing_action_type is None:
                raise_404()
            # keep tenant id
            if existing_action_type.tenantId != action_type.tenantId:
                raise_400('Tenant ID mismatch.')
            
            updated_action_type = action_type_service.update(action_type)
            action_type_service.commit_transaction()
            return updated_action_type
        except Exception as e:
            action_type_service.rollback_transaction()
            raise e

    return trans(action_type_service, action)


@router.get('/metricflow/action-type/all', tags=['CONSOLE', 'ADMIN'], response_model=List[ActionType])
async def find_all_action_types(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[ActionType]:
    action_type_service = get_action_type_service(principal_service)

    def action() -> List[ActionType]:
        return action_type_service.find_all_by_tenant_id(principal_service.get_tenant_id())

    return trans_readonly(action_type_service, action)


@router.post('/metricflow/action-type/page', tags=['CONSOLE', 'ADMIN'], response_model=ActionTypeDataPage)
async def find_action_types_page(
        criteria: Optional[dict] = None,
        pageable: Pageable = None,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> ActionTypeDataPage:
    action_type_service = get_action_type_service(principal_service)

    def action() -> ActionTypeDataPage:
        tenant_id: TenantId = principal_service.get_tenant_id()
        if criteria:
            # Basic implementation for criteria filtering, can be expanded
            return action_type_service.find_page_by_criteria(criteria, pageable)
        else:
            return action_type_service.find_page_by_text(None, pageable)

    return trans_readonly(action_type_service, action)


@router.get('/metricflow/action-type/{action_type_id}', tags=['CONSOLE', 'ADMIN'], response_model=ActionType)
async def find_action_type_by_id(
        action_type_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> ActionType:
    action_type_service = get_action_type_service(principal_service)

    def action() -> ActionType:
        action_type = action_type_service.find_by_id(action_type_id)
        if action_type is None:
            raise_404()
        return action_type

    return trans_readonly(action_type_service, action)


# Suggested Action Endpoints

@router.post('/metricflow/suggested-action', tags=['ADMIN'], response_model=SuggestedAction)
async def create_suggested_action(
        suggested_action: SuggestedAction,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> SuggestedAction:
    if is_blank(suggested_action.name):
        raise_400('Suggested action name is required.')

    suggested_action_service = get_suggested_action_service(principal_service)

    def action() -> SuggestedAction:
        suggested_action_service.begin_transaction()
        try:
            suggested_action.tenantId = principal_service.get_tenant_id()
            suggested_action.id = str(suggested_action_service.snowflakeGenerator.next_id())
            created_suggested_action = suggested_action_service.create(suggested_action)
            suggested_action_service.commit_transaction()
            return created_suggested_action
        except Exception as e:
            suggested_action_service.rollback_transaction()
            raise e

    return trans(suggested_action_service, action)


@router.post('/metricflow/suggested-action/update', tags=['ADMIN'], response_model=SuggestedAction)
async def update_suggested_action(
        suggested_action: SuggestedAction,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> SuggestedAction:
    if is_blank(suggested_action.id):
        raise_400('Suggested action ID is required.')

    suggested_action_service = get_suggested_action_service(principal_service)

    def action() -> SuggestedAction:
        suggested_action_service.begin_transaction()
        try:
            suggested_action.tenantId = principal_service.get_tenant_id()
            existing_action = suggested_action_service.find_by_id(suggested_action.id)
            if existing_action is None:
                raise_404()
            if existing_action.tenantId != suggested_action.tenantId:
                raise_400('Tenant ID mismatch.')

            updated_suggested_action = suggested_action_service.update(suggested_action)
            suggested_action_service.commit_transaction()
            return updated_suggested_action
        except Exception as e:
            suggested_action_service.rollback_transaction()
            raise e

    return trans(suggested_action_service, action)


@router.get('/metricflow/suggested-action/all', tags=['CONSOLE', 'ADMIN'], response_model=List[SuggestedAction])
async def find_all_suggested_actions(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[SuggestedAction]:
    suggested_action_service = get_suggested_action_service(principal_service)

    def action() -> List[SuggestedAction]:
        return suggested_action_service.find_all_by_tenant_id(principal_service.get_tenant_id())

    return trans_readonly(suggested_action_service, action)


@router.post('/metricflow/suggested-action/page', tags=['CONSOLE', 'ADMIN'], response_model=SuggestedActionDataPage)
async def find_suggested_actions_page(
        criteria: Optional[dict] = None,
        pageable: Pageable = None,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> SuggestedActionDataPage:
    suggested_action_service = get_suggested_action_service(principal_service)

    def action() -> SuggestedActionDataPage:
        if criteria:
             return suggested_action_service.find_page_by_criteria(criteria, pageable)
        else:
            return suggested_action_service.find_page_by_text(None, pageable)

    return trans_readonly(suggested_action_service, action)


@router.get('/metricflow/suggested-action/{suggested_action_id}', tags=['CONSOLE', 'ADMIN'], response_model=SuggestedAction)
async def find_suggested_action_by_id(
        suggested_action_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> SuggestedAction:
    suggested_action_service = get_suggested_action_service(principal_service)

    def action() -> SuggestedAction:
        suggested_action = suggested_action_service.find_by_id(suggested_action_id)
        if suggested_action is None:
            raise_404()
        return suggested_action

    return trans_readonly(suggested_action_service, action)
