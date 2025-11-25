from traceback import format_exc
from typing import Callable, Optional, Tuple, Dict, Any
from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask, TriggerOnline, Status, CollectorTableConfig
from watchmen_collector_kernel.service import ask_collector_storage, get_table_config_service, DataCaptureService
from watchmen_collector_kernel.storage import get_scheduled_task_service, ScheduledTaskService, \
    get_collector_table_config_service, get_collector_model_config_service
from watchmen_collector_kernel.storage.trigger_online_service import get_trigger_online_service
from watchmen_collector_surface.task.handler import pipeline_data
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_model.common import TenantId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_403

router = APIRouter()


@router.post('/collector/task', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=ScheduledTask)
async def save_task(
        task: ScheduledTask, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> ScheduledTask:
    validate_tenant_id(task, principal_service)
    scheduled_task_service = get_scheduled_task_service(ask_meta_storage(),
                                                        ask_snowflake_generator(),
                                                        principal_service)
    action = ask_save_scheduled_task_action(scheduled_task_service, principal_service)
    return action(task)


# noinspection PyUnusedLocal
def ask_save_scheduled_task_action(
        scheduled_task_service: ScheduledTaskService, principal_service: PrincipalService
) -> Callable[[ScheduledTask], ScheduledTask]:
    def action(task: ScheduledTask) -> ScheduledTask:
        if scheduled_task_service.is_storable_id_faked(task.taskId):
            scheduled_task_service.redress_storable_id(task)
            # noinspection PyTypeChecker
            scheduled_task: ScheduledTask = scheduled_task_service.create_task(task)
        else:
            # noinspection PyTypeChecker
            existing_scheduled_task: Optional[ScheduledTask] = scheduled_task_service.find_task_by_id(
                task.taskId)
            if existing_scheduled_task is not None:
                if existing_scheduled_task.tenantId != task.tenantId:
                    raise_403()
            # noinspection PyTypeChecker
            scheduled_task: ScheduledTask = scheduled_task_service.update_task(task)

        return scheduled_task

    return action


@router.post('/collector/trigger/online', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=None)
async def process_online_trigger(
        trigger: TriggerOnline, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Optional[TriggerOnline]:

    validate_tenant_id(trigger, principal_service)
    trigger_online_service = get_trigger_online_service(ask_collector_storage(trigger.tenantId, principal_service),
                                                        ask_snowflake_generator(),
                                                        principal_service)
    # noinspection PyTypeChecker
    if trigger_online_service.is_storable_id_faked(trigger.onlineTriggerId):
        trigger_online_service.redress_storable_id(trigger)
        trigger.status = Status.INITIAL.value
        trigger_online_service.create_trigger_online(trigger)
        try:
            data_ = find_json(trigger, principal_service)
            if data_:
                trace_id = await trigger_pipeline(trigger.code, data_, trigger.tenantId)
                trigger.status = Status.SUCCESS.value
                trigger.traceId = trace_id
            else:
                trigger.status = Status.FAIL.value
                trigger.result = "Not Found"
            trigger_online_service.update_trigger_online(trigger)
        except Exception as e:
            trigger.status = Status.FAIL.value
            trigger.result = format_exc()
            trigger_online_service.update_trigger_online(trigger)
    
    return trigger
        
    
def find_json(trigger: TriggerOnline, principal_service: PrincipalService) -> Dict:
    model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                              ask_snowflake_generator(),
                                                              principal_service)
    table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                              ask_snowflake_generator(),
                                                              principal_service)
    data_capture_service = DataCaptureService(ask_meta_storage(),
                                              ask_snowflake_generator(),
                                              principal_service)
    model_config = model_config_service.find_by_code(trigger.code, trigger.tenantId)
    table_config = table_config_service.find_root_table_config(model_config.modelName, trigger.tenantId)
    data = data_capture_service.find_data_by_data_id(table_config, trigger.record)
    root_config, root_data = data_capture_service.find_parent_node(table_config, data)
    data_capture_service.build_json(root_config, root_data)
    return root_data
    
    
async def trigger_pipeline(code: str, data_: Dict, tenant_id: TenantId):
    return await pipeline_data(code, data_, tenant_id)
        
        
        
        
        
    