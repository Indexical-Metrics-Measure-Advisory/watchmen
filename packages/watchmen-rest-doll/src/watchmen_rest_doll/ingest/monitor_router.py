from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, Body
from fastapi.encoders import jsonable_encoder

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent, Status
from watchmen_collector_kernel.model.trigger_online import TriggerOnline
from watchmen_collector_kernel.model.monitor import EventResultRecord
from watchmen_collector_kernel.service import ask_collector_storage, get_monitor_service
from watchmen_collector_kernel.storage import get_trigger_event_service, get_trigger_module_service, \
    get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, \
    get_change_data_record_history_service, get_change_data_json_service, get_change_data_json_history_service, \
    get_scheduled_task_service, get_scheduled_task_history_service, get_trigger_online_service
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import Pageable, DataPage, TenantId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.util import trans_readonly
from watchmen_utilities import ExtendedBaseModel, is_blank

router = APIRouter()


class QueryTriggerEventDataPage(DataPage):
    data: List[TriggerEvent]


@router.get('/ingest/query/event', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_event_by_id(event_trigger_id: Optional[int] = None,  principal_service: PrincipalService = Depends(get_any_admin_principal)
                                     ) -> TriggerEvent:
    if is_blank(event_trigger_id):
        raise_400('Trigger event id is required.')
        
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_event_service = get_trigger_event_service(ask_collector_storage(tenant_id, principal_service),
                                                      ask_snowflake_generator(),
                                                      principal_service)
    
    return trigger_event_service.find_event_by_id(event_trigger_id)


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


class TriggerEventStatsCriteria(ExtendedBaseModel):
    # size of the recent-events sample used for status/type/duration aggregates
    sampleSize: Optional[int] = 200


@router.post('/ingest/monitor/event/stats', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_event_stats(criteria: TriggerEventStatsCriteria = Body(...),
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Dict:
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_event_service = get_trigger_event_service(ask_collector_storage(tenant_id, principal_service),
                                                      ask_snowflake_generator(),
                                                      principal_service)
    sample_size = max(1, min(criteria.sampleSize or 200, 500))

    def action() -> QueryTriggerEventDataPage:
        # noinspection PyTypeChecker
        return trigger_event_service.find_page_by_tenant(
            None, tenant_id, Pageable(pageNumber=1, pageSize=sample_size))

    page = trans_readonly(trigger_event_service, action)
    events = page.data or []

    by_status: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    duration_mills = []
    for event in events:
        by_status[str(event.status)] = by_status.get(str(event.status), 0) + 1
        by_type[str(event.type)] = by_type.get(str(event.type), 0) + 1
        if event.startTime is not None and event.endTime is not None:
            duration_mills.append(round((event.endTime - event.startTime).total_seconds() * 1000))

    return {
        'total': page.itemCount or 0,
        'byStatus': by_status,
        'byType': by_type,
        'avgDurationMs': round(sum(duration_mills) / len(duration_mills)) if len(duration_mills) > 0 else 0,
        'sampleSize': len(events)
    }


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


EXECUTION_DETAIL_LIMIT = 100


def dump_execution_detail_model(entity, exclude=None) -> Dict:
    model_dump = getattr(entity, 'model_dump', None)
    if callable(model_dump):
        return model_dump(mode='json', by_alias=True, exclude_none=True, exclude=exclude)
    data = entity.to_dict()
    for field in exclude or []:
        data.pop(field, None)
    return jsonable_encoder(data)


def create_execution_detail_error(source: str, entity) -> Dict:
    error = dump_execution_detail_model(
        entity, exclude={'records', 'content', 'dataId', 'rootDataId', 'dependOn'})
    error['source'] = source
    return error


def collect_execution_detail_trace_links(tasks: List[Dict]) -> List[Dict]:
    trace_links = []
    for task in tasks:
        result = task.get('result')
        if not isinstance(result, dict) or not isinstance(result.get('traceLinks'), list):
            continue
        for trace_link in result['traceLinks']:
            if isinstance(trace_link, dict):
                trace_links.append({**trace_link, 'taskId': task.get('taskId')})
    return trace_links


@router.get('/ingest/monitor/event/execution-detail', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_event_execution_detail(
        trigger_event_id: Optional[int] = None,
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Dict:
    if is_blank(trigger_event_id):
        raise_400('Trigger event id is required.')

    tenant_id: TenantId = principal_service.get_tenant_id()
    storage = ask_collector_storage(tenant_id, principal_service)
    snowflake_generator = ask_snowflake_generator()
    trigger_event_service = get_trigger_event_service(storage, snowflake_generator, principal_service)
    event = trigger_event_service.find_event_by_id(trigger_event_id)
    if event is None or event.tenantId != tenant_id:
        raise_404()

    query_limit = EXECUTION_DETAIL_LIMIT + 1
    trigger_table_service = get_trigger_table_service(storage, snowflake_generator, principal_service)
    scheduled_task_service = get_scheduled_task_service(storage, snowflake_generator, principal_service)
    scheduled_task_history_service = get_scheduled_task_history_service(
        storage, snowflake_generator, principal_service)
    tables = trigger_table_service.find_by_event_trigger_id_and_tenant_id(
        trigger_event_id, tenant_id, query_limit)
    active_tasks = scheduled_task_service.find_by_event_trigger_id_and_tenant_id(
        trigger_event_id, tenant_id, query_limit)
    task_history = scheduled_task_history_service.find_by_event_trigger_id_and_tenant_id(
        trigger_event_id, tenant_id, query_limit)

    change_record_history_service = get_change_data_record_history_service(
        storage, snowflake_generator, principal_service)
    change_json_history_service = get_change_data_json_history_service(
        storage, snowflake_generator, principal_service)
    failed_records = change_record_history_service.find_by_event_trigger_id_and_tenant_id(
        trigger_event_id, tenant_id, query_limit, Status.FAIL.value)
    failed_json = change_json_history_service.find_by_event_trigger_id_and_tenant_id(
        trigger_event_id, tenant_id, query_limit, Status.FAIL.value)
    failed_tasks = scheduled_task_history_service.find_by_event_trigger_id_and_tenant_id(
        trigger_event_id, tenant_id, query_limit, Status.FAIL.value)

    tables_truncated = len(tables) > EXECUTION_DETAIL_LIMIT
    active_tasks_truncated = len(active_tasks) > EXECUTION_DETAIL_LIMIT
    task_history_truncated = len(task_history) > EXECUTION_DETAIL_LIMIT
    tables = tables[:EXECUTION_DETAIL_LIMIT]
    active_tasks = active_tasks[:EXECUTION_DETAIL_LIMIT]
    task_history = task_history[:EXECUTION_DETAIL_LIMIT]
    active_task_data = [dump_execution_detail_model(task, exclude={'content'}) for task in active_tasks]
    task_history_data = [dump_execution_detail_model(task, exclude={'content'}) for task in task_history]

    errors = []
    if event.status == Status.FAIL.value and event.result:
        errors.append(create_execution_detail_error('event', event))
    errors.extend(create_execution_detail_error('record', record) for record in failed_records)
    errors.extend(create_execution_detail_error('json', change_json) for change_json in failed_json)
    errors.extend(create_execution_detail_error('task', task) for task in failed_tasks)
    errors_truncated = len(errors) > EXECUTION_DETAIL_LIMIT

    return {
        'event': dump_execution_detail_model(event, exclude={'records'}),
        'tables': [dump_execution_detail_model(table) for table in tables],
        'tasks': {'active': active_task_data, 'history': task_history_data},
        'errors': errors[:EXECUTION_DETAIL_LIMIT],
        'traceLinks': collect_execution_detail_trace_links(active_task_data + task_history_data),
        'limits': {'tables': EXECUTION_DETAIL_LIMIT, 'tasks': EXECUTION_DETAIL_LIMIT,
                   'errors': EXECUTION_DETAIL_LIMIT},
        'truncated': {
            'tables': tables_truncated,
            'tasks': {'active': active_tasks_truncated, 'history': task_history_truncated},
            'errors': errors_truncated,
            'traceLinks': active_tasks_truncated or task_history_truncated
        }
    }


@router.get('/ingest/monitor/event/detail', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def monitor_task_by_event(
        trigger_event_id: Optional[int],
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[EventResultRecord]:
    
    monitor_service = get_monitor_service(principal_service)
    
    return monitor_service.query_event_detail(trigger_event_id)


@router.get('/ingest/monitor/trigger-online', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_recent_trigger_onlines(
        principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[TriggerOnline]:
    # online triggers are high-volume realtime records; always return the latest 10 only
    tenant_id: TenantId = principal_service.get_tenant_id()
    trigger_online_service = get_trigger_online_service(ask_collector_storage(tenant_id, principal_service),
                                                        ask_snowflake_generator(),
                                                        principal_service)

    def action() -> List[TriggerOnline]:
        return trigger_online_service.find_recent_triggers(tenant_id, 10)

    return trans_readonly(trigger_online_service, action)