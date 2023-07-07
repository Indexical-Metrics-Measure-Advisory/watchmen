from typing import List

from fastapi import APIRouter, Depends
from watchmen_utilities import is_blank

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent, Status, EventType
from watchmen_collector_kernel.storage import get_trigger_event_service, get_change_data_record_service, \
	get_change_data_json_service, get_scheduled_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_400

router = APIRouter()


@router.post('/collector/trigger/event', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=TriggerEvent)
async def save_event_trigger(
		event: TriggerEvent, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> TriggerEvent:
	if event.startTime is None or event.endTime is None:
		raise_400('start time or end time  is required.')

	validate_tenant_id(event, principal_service)
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	# noinspection PyTypeChecker
	if trigger_event_service.is_storable_id_faked(event.eventTriggerId):
		trigger_event_service.redress_storable_id(event)
		event.isFinished = False
		event.status = Status.INITIAL.value
		event.type = EventType.DEFAULT.value
		return trigger_event_service.create_trigger_event(event)


@router.post('/collector/trigger/event/table', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=TriggerEvent)
async def trigger_event_by_table(
		event: TriggerEvent, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> TriggerEvent:
	if event.startTime is None or event.endTime is None:
		raise_400('start time or end time  is required.')

	if is_blank(event.tableName):
		raise_400('table name is required.')

	validate_tenant_id(event, principal_service)
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	# noinspection PyTypeChecker
	if trigger_event_service.is_storable_id_faked(event.eventTriggerId):
		trigger_event_service.redress_storable_id(event)
		event.isFinished = False
		event.status = Status.INITIAL.value
		event.type = EventType.BY_TABLE.value
		return trigger_event_service.create_trigger_event(event)


@router.post('/collector/trigger/event/record', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=TriggerEvent)
async def trigger_event_by_table(
		event: TriggerEvent, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> TriggerEvent:
	if is_blank(event.tableName):
		raise_400('table name is required.')

	if event.records is None or len(event.records) == 0:
		raise_400('records is required.')

	validate_tenant_id(event, principal_service)
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	# noinspection PyTypeChecker
	if trigger_event_service.is_storable_id_faked(event.eventTriggerId):
		trigger_event_service.redress_storable_id(event)
		event.isFinished = False
		event.status = Status.INITIAL.value
		event.type = EventType.BY_RECORD.value
		return trigger_event_service.create_trigger_event(event)


@router.get("/collector/trigger/events/unfinished", tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
            response_model=List[TriggerEvent])
async def load_event_triggers_unfinished(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	return trigger_event_service.find_unfinished_events()


@router.get('/collector/trigger/events/finished', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
            response_model=List[TriggerEvent])
async def load_event_triggers_unfinished(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	return trigger_event_service.find_finished_events()


@router.get('/collector/trigger/event/count', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN])
async def load_count_of_trigger_event(
		trigger_event_id: int = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)):
	trigger_event_service = get_trigger_event_service(ask_meta_storage(),
	                                                  ask_snowflake_generator(),
	                                                  principal_service)
	result = {}
	trigger_event_service.begin_transaction()
	try:
		record_service = get_change_data_record_service(trigger_event_service.storage,
		                                                trigger_event_service.snowflakeGenerator,
		                                                trigger_event_service.principalService)
		result["record"] = record_service.count_change_data_record(trigger_event_id)

		json_service = get_change_data_json_service(trigger_event_service.storage,
		                                            trigger_event_service.snowflakeGenerator,
		                                            trigger_event_service.principalService)
		result["json"] = json_service.count_change_data_json(trigger_event_id)

		task_service = get_scheduled_task_service(trigger_event_service.storage,
		                                          trigger_event_service.snowflakeGenerator,
		                                          trigger_event_service.principalService)
		result["task"] = task_service.count_scheduled_task(trigger_event_id)

		trigger_event_service.commit_transaction()
		return result
	finally:
		trigger_event_service.close_transaction()
