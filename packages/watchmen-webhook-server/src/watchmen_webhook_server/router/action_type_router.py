from typing import List

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.alert import ActionTypeService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.alert import ActionType
from watchmen_model.common import ActionTypeId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import validate_tenant_id
from watchmen_utilities import is_blank

router = APIRouter()


def get_action_type_service(principal_service: PrincipalService) -> ActionTypeService:
	return ActionTypeService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/alert/action-type', tags=['alert'], response_model=ActionType)
async def save_action_type(
		action_type: ActionType, principal_service: PrincipalService = Depends(get_admin_principal)) -> ActionType:
	validate_tenant_id(action_type, principal_service)
	service = get_action_type_service(principal_service)
	if is_blank(action_type.actionTypeId):
		service.create(action_type)
	else:
		service.update(action_type)
	return action_type


@router.get('/alert/action-type/all', tags=['alert'], response_model=List[ActionType])
async def find_all_action_types(
		principal_service: PrincipalService = Depends(get_admin_principal)) -> List[ActionType]:
	service = get_action_type_service(principal_service)
	return service.find_all_by_tenant_id(principal_service.tenantId)


@router.get('/alert/action-type', tags=['alert'], response_model=ActionType)
async def load_action_type(
		action_type_id: ActionTypeId, principal_service: PrincipalService = Depends(get_admin_principal)) -> ActionType:
	service = get_action_type_service(principal_service)
	return service.find_by_id(action_type_id)
