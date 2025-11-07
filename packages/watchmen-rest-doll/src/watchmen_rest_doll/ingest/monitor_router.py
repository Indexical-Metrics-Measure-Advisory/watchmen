from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, Body

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.model.monitor import EventResultRecord
from watchmen_collector_kernel.service import ask_collector_storage, get_monitor_service
from watchmen_collector_kernel.storage import get_trigger_event_service, get_trigger_module_service, \
    get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, \
    get_change_data_record_history_service, get_change_data_json_service, get_change_data_json_history_service, \
    get_scheduled_task_service, get_scheduled_task_history_service
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import Pageable, DataPage, TenantId
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.util import trans_readonly

router = APIRouter()


class QueryTriggerEventDataPage(DataPage):
    data: List[TriggerEvent]


@router.post('/ingest/monitor/event', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_events_page_by_tenant(pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryTriggerEventDataPage:
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_event_service = get_trigger_event_service(ask_collector_storage(tenant_id, principal_service),
                                                      ask_snowflake_generator(),
                                                      principal_service)
    def action() -> QueryTriggerEventDataPage:
    
        # noinspection PyTypeChecker
        return trigger_event_service.find_page_by_tenant(None, tenant_id, pageable)

    return trans_readonly(trigger_event_service, action)


@router.post('/ingest/monitor/module', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_events_page_by_event(
        trigger_event_id: Optional[int], pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_module_service = get_trigger_module_service(ask_collector_storage(tenant_id, principal_service),
                                                        ask_snowflake_generator(),
                                                        principal_service)

    def action() -> QueryTriggerEventDataPage:
        # noinspection PyTypeChecker
        return trigger_module_service.find_page_by_event_trigger_id(trigger_event_id, pageable)

    return trans_readonly(trigger_module_service, action)


@router.post('/ingest/monitor/model', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_events_page_by_event(
        trigger_event_id: Optional[int], pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_model_service = get_trigger_model_service(ask_collector_storage(tenant_id, principal_service),
                                                      ask_snowflake_generator(),
                                                      principal_service)

    return trigger_model_service.find_page_by_event_trigger_id(trigger_event_id, pageable)

    


@router.post('/ingest/monitor/table', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_events_page_by_event(
        trigger_event_id: Optional[int], pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_table_service = get_trigger_table_service(ask_collector_storage(tenant_id, principal_service),
                                                      ask_snowflake_generator(),
                                                      principal_service)


    # noinspection PyTypeChecker
    return trigger_table_service.find_page_by_event_trigger_id(trigger_event_id, pageable)



@router.post('/ingest/monitor/record', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_record_by_event(
        trigger_event_id: Optional[int], principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Dict:
    tenant_id: TenantId = principal_service.get_tenant_id()
    change_record_service = get_change_data_record_service(ask_collector_storage(tenant_id, principal_service),
                                                           ask_snowflake_generator(),
                                                           principal_service)
    change_record_history_service = get_change_data_record_history_service(ask_collector_storage(tenant_id, principal_service),
                                                                           ask_snowflake_generator(),
                                                                           principal_service)
    def count_unfinished() -> int:
        return change_record_service.count_change_data_record(trigger_event_id)

    def count_finished() -> int:
        return change_record_history_service.count_change_data_record(trigger_event_id)

    unfinished = trans_readonly(change_record_service, count_unfinished)
    finished = trans_readonly(change_record_history_service, count_finished)

    return {"unfinished": unfinished, "finished": finished}


@router.post('/ingest/monitor/json', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_json_by_event(
        trigger_event_id: Optional[int],
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Dict:
    tenant_id: TenantId = principal_service.get_tenant_id()
    change_json_service = get_change_data_json_service(ask_collector_storage(tenant_id, principal_service),
                                                       ask_snowflake_generator(),
                                                       principal_service)
    change_json_history_service = get_change_data_json_history_service(ask_collector_storage(tenant_id, principal_service),
                                                                       ask_snowflake_generator(),
                                                                       principal_service)
    
    def count_unfinished() -> int:
        return change_json_service.count_change_data_json(trigger_event_id)
    
    def count_finished() -> int:
        return change_json_history_service.count_change_data_json(trigger_event_id)
    
    unfinished = trans_readonly(change_json_service, count_unfinished)
    finished = trans_readonly(change_json_history_service, count_finished)
    
    return {"unfinished": unfinished, "finished": finished}


@router.post('/ingest/monitor/task', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_task_by_event(
        trigger_event_id: Optional[int],
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Dict:
    scheduled_task_service = get_scheduled_task_service(ask_collector_storage(principal_service.get_tenant_id(),
                                                                              principal_service),
                                                        ask_snowflake_generator(),
                                                        principal_service)
    scheduled_task_history_service = get_scheduled_task_history_service(ask_collector_storage(principal_service.get_tenant_id(), principal_service),
                                                                        ask_snowflake_generator(),
                                                                        principal_service)

    def count_unfinished() -> int:
        return scheduled_task_service.count_scheduled_task(trigger_event_id)
        
    def count_finished() -> int:
        return scheduled_task_history_service.count_scheduled_task(trigger_event_id)
        
    unfinished = trans_readonly(scheduled_task_service, count_unfinished)
    finished = trans_readonly(scheduled_task_history_service, count_finished)
    
    return {"unfinished": unfinished, "finished": finished}


@router.get('/ingest/monitor/event/detail', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_task_by_event(
        trigger_event_id: Optional[int],
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[EventResultRecord]:
    
    monitor_service = get_monitor_service(principal_service)
    
    return monitor_service.query_event_detail(trigger_event_id)