import logging
from typing import Optional

from watchmen_collector_kernel.model import TriggerEvent, TriggerModel, TriggerTable, TriggerModule, Status, EventType
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_trigger_event_service, \
    get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, get_change_data_json_service, \
    get_trigger_module_service, get_scheduled_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_model.system import Tenant
from watchmen_serverless_lambda.storage import ask_file_log_service
from watchmen_utilities import ArrayHelper
from watchmen_serverless_lambda.service.event.trigger_event_helper import trigger_event_by_default, trigger_event_by_table, trigger_event_by_records, \
    trigger_event_by_pipeline, trigger_event_by_schedule

logger = logging.getLogger(__name__)


class EventWorker:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        
        self.trigger_event_service = get_trigger_event_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.trigger_module_service = get_trigger_module_service(self.collector_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        self.trigger_model_service = get_trigger_model_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.trigger_table_service = get_trigger_table_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.data_record_service = get_change_data_record_service(self.collector_storage,
                                                                  self.snowflake_generator,
                                                                  self.principal_service)
        self.data_json_service = get_change_data_json_service(self.collector_storage,
                                                              self.snowflake_generator,
                                                              self.principal_service)
        self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        self.log_service = ask_file_log_service()
    
    def is_all_modules_finished(self, event: TriggerEvent) -> bool:
        return ArrayHelper(
            self.trigger_module_service.find_by_event_trigger_id(event.eventTriggerId)).every(
            lambda trigger_module: self.is_trigger_module_finished(trigger_module)
        )
    
    def is_trigger_module_finished(self, trigger_module: TriggerModule) -> bool:
        if trigger_module.isFinished:
            return True
        else:
            if self.is_all_models_finished(trigger_module):
                trigger_module.isFinished = True
                self.trigger_module_service.begin_transaction()
                try:
                    self.trigger_module_service.update(trigger_module)
                    self.trigger_model_service.commit_transaction()
                except Exception as e:
                    self.trigger_event_service.rollback_transaction()
                    raise e
                finally:
                    self.trigger_event_service.close_transaction()
                
                return True
            else:
                return False
    
    def is_all_models_finished(self, trigger_module: TriggerModule) -> bool:
        return ArrayHelper(
            self.trigger_model_service.find_by_module_trigger_id(trigger_module.moduleTriggerId)
        ).every(lambda trigger_model: self.is_trigger_model_finished(trigger_model))
    
    def is_trigger_model_finished(self, trigger_model: TriggerModel) -> bool:
        if trigger_model.isFinished:
            return True
        else:
            if self.is_all_tables_extracted(trigger_model):
                trigger_model.isFinished = True
                self.trigger_model_service.begin_transaction()
                try:
                    self.trigger_model_service.update(trigger_model)
                    self.trigger_model_service.commit_transaction()
                    return True
                except Exception as e:
                    self.trigger_model_service.rollback_transaction()
                    raise e
                finally:
                    self.trigger_model_service.close_transaction()
            else:
                return False
    
    def is_all_records_merged(self, trigger_event: TriggerEvent) -> bool:
        return self.data_record_service.is_event_finished(trigger_event.eventTriggerId)
    
    def is_all_json_posted(self, trigger_event: TriggerEvent) -> bool:
        return self.data_json_service.is_event_finished(trigger_event.eventTriggerId)
    
    def is_all_tasks_finished(self, trigger_event: TriggerEvent) -> bool:
        return self.scheduled_task_service.is_event_finished(trigger_event.eventTriggerId)
    
    def is_all_tables_extracted(self, trigger_model: TriggerModel) -> bool:
        return ArrayHelper(
            self.trigger_table_service.find_by_model_trigger_id(trigger_model.modelTriggerId)
        ).every(
            lambda trigger_table: self.is_table_extracted(trigger_table)
        )
    
    # noinspection PyMethodMayBeStatic
    def is_table_extracted(self, trigger_table: TriggerTable) -> bool:
        return trigger_table.isExtracted
    
    # noinspection PyMethodMayBeStatic
    def is_finished(self, event: TriggerEvent) -> bool:
        return event.isFinished
    
    def get_initial_trigger_event(self, tenant: Tenant) -> Optional[TriggerEvent]:
        return self.trigger_event_service.find_initial_event_by_tenant_id(tenant.tenantId)
    
    def queuing_event(self, tenant: Tenant):
        event = self.get_initial_trigger_event(tenant)
        if event:
            if event.type == EventType.DEFAULT.value:
                trigger_event_by_default(event)
            elif event.type == EventType.BY_TABLE.value:
                trigger_event_by_table(event)
            elif event.type == EventType.BY_RECORD.value:
                trigger_event_by_records(event)
            elif event.type == EventType.BY_PIPELINE.value:
                trigger_event_by_pipeline(event)
            elif event.type == EventType.BY_SCHEDULE.value:
                trigger_event_by_schedule(event)
            else:
                raise Exception(f'Event type {event.type} is not supported.')
        else:
            logger.info(f'tenant {tenant.name} have no event')
    
    def get_executing_trigger_event(self, tenant: Tenant) -> Optional[TriggerEvent]:
        return self.trigger_event_service.find_executing_event_by_tenant_id(tenant.tenantId)
    
    def check_finished(self, event: TriggerEvent):
        if self.is_all_modules_finished(event) and self.is_all_records_merged(
                event) and self.is_all_json_posted(event) and self.is_all_tasks_finished(event):
            event.isFinished = True
            event.status = Status.SUCCESS.value
            self.trigger_event_service.update_trigger_event(event)
            self.log_service.log_result(self.tenant_id, self.ask_monitor_key(event), event.to_dict())
            
    def ask_monitor_key(self, trigger_event: TriggerEvent) -> str:
        key = f'monitor/{self.tenant_id}/{trigger_event.eventTriggerId}.json'
        return key