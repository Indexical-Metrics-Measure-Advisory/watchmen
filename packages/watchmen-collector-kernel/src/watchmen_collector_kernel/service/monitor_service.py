from typing import List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerTable
from watchmen_collector_kernel.model.monitor import EventResultRecord
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_trigger_table_service, get_trigger_module_service, \
    get_change_data_json_service, get_change_data_json_history_service, get_change_data_record_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator


class MonitorService:


    def __init__(self, principal_service: PrincipalService):
        
        self.principal_service = principal_service
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.collector_storage = ask_collector_storage(principal_service.tenantId, self.principal_service)
        self.trigger_table_service = get_trigger_table_service(self.collector_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        self.trigger_module_service = get_trigger_module_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                self.snowflake_generator,
                                                                self.principal_service)
        self.change_json_service = get_change_data_json_service(self.collector_storage,
                                                                self.snowflake_generator,
                                                                self.principal_service)
        self.change_json_history_service = get_change_data_json_history_service(self.collector_storage,
                                                                                self.snowflake_generator,
                                                                                self.principal_service)
        
        
    def query_event_detail(self, event_trigger_id: int) -> List[EventResultRecord]:
        trigger_tables: List[TriggerTable] =  self.trigger_table_service.find_by_event_trigger_id(event_trigger_id)
        results: List[EventResultRecord] = []
        for trigger_table in trigger_tables:
            trigger_module = self.trigger_module_service.find_trigger_by_id(trigger_table.moduleTriggerId)
            unfinished = self.count_current_json(trigger_table)
            finished = self.count_finished_json(trigger_table)
            record =  EventResultRecord(
                eventTriggerId=trigger_table.eventTriggerId,
                moduleTriggerId=trigger_table.moduleTriggerId,
                modelTriggerId=trigger_table.modelTriggerId,
                tableTriggerId=trigger_table.tableTriggerId,
                moduleName=trigger_module.moduleName,
                modelName=trigger_table.modelName,
                tableName=trigger_table.tableName,
                startTime=trigger_table.createdAt,
                dataCount=trigger_table.dataCount,
                jsonCount=unfinished,
                jsonFinishedCount=finished,
                status=self.get_status(trigger_table),
                percent=finished/(unfinished+finished),
                errors=self.get_errors(trigger_table)
            )
            results.append(record)
        return results
    
    def count_current_json(self, trigger_table: TriggerTable) -> int:
        return self.change_json_service.count_change_data_json_by_table_trigger_id(trigger_table.tableTriggerId)
        
    def count_finished_json(self,trigger_table: TriggerTable) -> int:
        return self.change_json_history_service.count_change_data_json_by_table_trigger_id(trigger_table.tableTriggerId)
    
    def get_status(self, trigger_table: TriggerTable) -> int:
        if trigger_table.isExtracted:
            if (self.change_record_service.is_table_finished(trigger_table.tableTriggerId)
                    and self.change_json_service.is_table_finished(trigger_table.tableTriggerId)):
                return 2
            else:
                return 1
        else:
            return 0
    
    def get_errors(self, trigger_table: TriggerTable) -> int:
        return self.change_json_history_service.count_failed_change_data_json(trigger_table.tableTriggerId)
        
        
def get_monitor_service(principal_service: PrincipalService) -> MonitorService:
    return MonitorService(principal_service)