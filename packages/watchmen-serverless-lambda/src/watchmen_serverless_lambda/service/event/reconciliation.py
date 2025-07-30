import logging
from typing import Dict

from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_trigger_event_service, \
    get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, get_change_data_json_service, \
    get_trigger_module_service, get_scheduled_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_serverless_lambda.storage import ask_file_log_service

logger = logging.getLogger(__name__)


class Reconciliation:
    
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
    
        
    def reconciled(self, event: TriggerEvent):
        report = {
            "event": event.to_dict()
        }
        
        modules = self.trigger_module_service.find_by_event_trigger_id(event.eventTriggerId)
        report["modules"] = modules
        
        models = self.trigger_model_service.find_by_event_trigger_id(event.eventTriggerId)
        report["models"] = models
        
        tables = self.trigger_table_service.find_by_event_trigger_id(event.eventTriggerId)
        report["tables"] = tables
        
        self.generate_report(event, report)
    
    def generate_report(self, event: TriggerEvent, report: Dict):
        self.log_service.log_result(self.tenant_id, self.ask_report_key(event), report)
    
    
    def ask_report_key(self, trigger_event: TriggerEvent) -> str:
        key = f'reconciliation/{self.tenant_id}/{trigger_event.eventTriggerId}'
        return key
    

def get_reconciliation(tenant_id: str) -> Reconciliation:
    return Reconciliation(tenant_id)