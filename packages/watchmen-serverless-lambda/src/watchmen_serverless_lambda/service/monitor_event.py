import logging
from typing import Optional

from watchmen_model.system import Tenant

from watchmen_data_kernel.meta import TenantService

from watchmen_collector_kernel.model import TriggerEvent, TriggerModel, TriggerTable, TriggerModule, Status, EventType
from watchmen_collector_kernel.service import try_lock_nowait, unlock, get_resource_lock, ask_collector_storage
from .trigger_event_helper import trigger_event_by_default, trigger_event_by_table, trigger_event_by_records, trigger_event_by_pipeline
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_trigger_event_service, \
	get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, get_change_data_json_service, \
	get_trigger_module_service, get_scheduled_task_service

from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_utilities import ArrayHelper

logger = logging.getLogger(__name__)

class EventListener:
    
    def __init__(self):
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
        self.tenant_service = TenantService(self.principal_service)
        
    
    def event_listener(self) -> None:
        tenants = self.tenant_service.find_all()
        for tenant in tenants:
            lock = get_resource_lock(self.snowflake_generator.next_id(),
                                     self.trigger_event_lock_resource_id(tenant),
                                     tenant.tenantId)
            try:
                if try_lock_nowait(self.competitive_lock_service, lock):
                    self.process_trigger_event(tenant)
            finally:
                unlock(self.competitive_lock_service, lock)
    
    def process_trigger_event(self, tenant: Tenant):
        event_processor = EventProcessor(tenant.tenantId)
        event = event_processor.get_executing_trigger_event(tenant)
        if event is None:
            event_processor.queuing_event(tenant)
        else:
            event_processor.check_finished(event)
        
    # noinspection PyMethodMayBeStatic
    def trigger_event_lock_resource_id(self, tenant: Tenant) -> str:
        return f'trigger_event_{tenant.tenantId}'
    
    
class EventProcessor:
    def __init__(self, tenant_id: str):
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collectr_storage = ask_collector_storage(tenant_id, self.principal_service)
       
        self.trigger_event_service = get_trigger_event_service(self.collectr_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.trigger_module_service = get_trigger_module_service(self.collectr_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        self.trigger_model_service = get_trigger_model_service(self.collectr_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.trigger_table_service = get_trigger_table_service(self.collectr_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.data_record_service = get_change_data_record_service(self.collectr_storage,
                                                                  self.snowflake_generator,
                                                                  self.principal_service)
        self.data_json_service = get_change_data_json_service(self.collectr_storage,
                                                              self.snowflake_generator,
                                                              self.principal_service)
        self.scheduled_task_service = get_scheduled_task_service(self.collectr_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
       
    
    
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
    