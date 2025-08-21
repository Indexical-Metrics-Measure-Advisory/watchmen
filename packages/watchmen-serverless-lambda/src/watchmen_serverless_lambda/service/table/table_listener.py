import logging

from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_trigger_table_service
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator, ask_meta_storage
from watchmen_serverless_lambda.common import ask_serverless_number_of_extract_table_coordinator

logger = logging.getLogger(__name__)


class TableListener:
    
    def __init__(self, tenant_id: str):
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.trigger_table_service = get_trigger_table_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
    
    def ask_number_of_coordinators(self, trigger_event: TriggerEvent) -> int:
        trigger_tables = self.trigger_table_service.count_unfinished_by_event_trigger_id(trigger_event.eventTriggerId)
        if trigger_tables:
            return ask_serverless_number_of_extract_table_coordinator()
        else:
            return 0
        
        
    
def get_table_listener(tenant_id: str) -> TableListener:
    return TableListener(tenant_id)