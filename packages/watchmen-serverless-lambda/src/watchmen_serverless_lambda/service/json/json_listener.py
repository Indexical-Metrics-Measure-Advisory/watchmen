from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_json_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_serverless_lambda.common import ask_serverless_json_coordinator_batch_size, \
    ask_serverless_max_number_of_coordinator


class JSONListener:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.change_json_service = get_change_data_json_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
    
    def ask_number_of_coordinators(self, trigger_event: TriggerEvent) -> int:
        try:
            self.change_json_service.begin_transaction()
            count = self.change_json_service.count_initial_change_data_json(trigger_event.eventTriggerId)
            self.change_json_service.commit_transaction()
            if count:
                size = count // ask_serverless_json_coordinator_batch_size() + 1
                if size > ask_serverless_max_number_of_coordinator():
                    return ask_serverless_max_number_of_coordinator()
                else:
                    return size
            else:
                return 0
        finally:
            self.change_json_service.close_transaction()


def get_json_listener(tenant_id: str) -> JSONListener:
    return JSONListener(tenant_id)