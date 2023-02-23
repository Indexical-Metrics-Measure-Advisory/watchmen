from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import get_trigger_collector
from watchmen_collector_kernel.storage import get_trigger_event_service
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id

router = APIRouter()


@router.post('/collector/trigger/event', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=TriggerEvent)
async def save_event_trigger(
		event: TriggerEvent, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> TriggerEvent:
	validate_tenant_id(event, principal_service)
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	func_trigger_collector = get_trigger_collector()
	if trigger_event_service.is_storable_id_faked(event.eventTriggerId):
		trigger_event_service.redress_storable_id(event)
		event.isFinished = False
		trigger_event = func_trigger_collector(trigger_event_service,
		                                       event,
		                                       principal_service)
		return trigger_event
