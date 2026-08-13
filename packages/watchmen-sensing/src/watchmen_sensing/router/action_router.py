from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

from watchmen_sensing.meta.action_record_service import ActionRecordService
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.service.action_service import ActionService
from watchmen_sensing.settings import ask_sensing_autonomous_level

router = APIRouter()


def ask_action_service(principal_service: PrincipalService) -> ActionService:
	action_record_service = ActionRecordService(
		ask_meta_storage(), ask_snowflake_generator(), principal_service)
	signal_service = SignalService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	return ActionService(
		action_record_service, signal_service,
		autonomous_level_cap=ask_sensing_autonomous_level())


@router.get('/sensing/actions/pending', tags=['sensing'])
async def list_pending_actions(principal_service: PrincipalService = Depends(get_any_principal)):
	service = ask_action_service(principal_service)
	return service.find_pending(principal_service.get_tenant_id())


@router.get('/sensing/actions/by-signal/{signal_id}', tags=['sensing'])
async def list_actions_by_signal(
		signal_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_action_service(principal_service)
	return service.find_by_signal(signal_id, principal_service.get_tenant_id())


@router.post('/sensing/actions/{action_id}/approve', tags=['sensing'])
async def approve_action(
		action_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_action_service(principal_service)
	return service.approve(action_id, principal_service.get_tenant_id())


@router.post('/sensing/actions/{action_id}/execute', tags=['sensing'])
async def execute_action(
		action_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_action_service(principal_service)
	return await service.execute(action_id, principal_service.get_tenant_id())
