from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.service.context_service import ContextService

router = APIRouter()


@router.get('/sensing/signals/{signal_id}/context', tags=['sensing'])
async def get_signal_context(
		signal_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	signal_service = SignalService(
		ask_meta_storage(), ask_snowflake_generator(), principal_service)
	adapters = AdapterBundle(principal_service)
	context_service = ContextService(signal_service, adapters)
	return context_service.build_for(signal_id, principal_service.get_tenant_id())
