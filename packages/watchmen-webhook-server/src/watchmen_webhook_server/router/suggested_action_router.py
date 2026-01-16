from typing import List

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.alert import SuggestedActionService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.alert import SuggestedAction
from watchmen_model.common import SuggestedActionId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import validate_tenant_id
from watchmen_utilities import is_blank

router = APIRouter()


def get_suggested_action_service(principal_service: PrincipalService) -> SuggestedActionService:
	return SuggestedActionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/alert/suggested-action', tags=['alert'], response_model=SuggestedAction)
async def save_suggested_action(
		action: SuggestedAction, principal_service: PrincipalService = Depends(get_admin_principal)) -> SuggestedAction:
	validate_tenant_id(action, principal_service)
	service = get_suggested_action_service(principal_service)
	if is_blank(action.suggestedActionId):
		service.create(action)
	else:
		service.update(action)
	return action


@router.get('/alert/suggested-action/all', tags=['alert'], response_model=List[SuggestedAction])
async def find_all_suggested_actions(
		principal_service: PrincipalService = Depends(get_admin_principal)) -> List[SuggestedAction]:
	service = get_suggested_action_service(principal_service)
	return service.find_all_by_tenant_id(principal_service.tenantId)


@router.delete('/alert/suggested-action', tags=['alert'], response_model=SuggestedAction)
async def delete_suggested_action(
		action_id: SuggestedActionId,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> SuggestedAction:
	service = get_suggested_action_service(principal_service)
	action = service.find_by_id(action_id)
	if action:
		validate_tenant_id(action, principal_service)
		service.delete(action_id)
	return action
