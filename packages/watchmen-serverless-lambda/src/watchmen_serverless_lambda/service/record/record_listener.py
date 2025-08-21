from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_record_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_serverless_lambda.common import ask_serverless_number_of_record_coordinator


class RecordListener:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)

    
    def ask_number_of_coordinators(self, trigger_event: TriggerEvent) -> int:
        count = self.change_record_service.count_initial_change_data_record(trigger_event.eventTriggerId)
        if count == 0:
            return count
        else:
            return ask_serverless_number_of_record_coordinator()
        
    
def get_record_listener(tenant_id: str) -> RecordListener:
    return RecordListener(tenant_id)