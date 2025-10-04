from watchmen_collector_kernel.common import ask_collector_timeout, ask_collector_task_timeout
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
    get_change_data_json_service, get_scheduled_task_service, get_change_data_json_history_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from .clean_executing_timeout import clean_record_executing_timeout, clean_json_executing_timeout, \
    clean_task_executing_timeout
from .clean_lock import clean_lock, clean_self
from .clean_waiting_timeout import clean_json_waiting_timeout


class CleanWorker:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
        self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
        self.change_data_record_service = get_change_data_record_service(self.collector_storage,
                                                                         self.snowflake_generator,
                                                                         self.principal_service)
        self.change_data_json_service = get_change_data_json_service(self.collector_storage,
                                                                         self.snowflake_generator,
                                                                         self.principal_service)
        self.change_data_json_history_service = get_change_data_json_history_service(self.collector_storage,
                                                                                     self.snowflake_generator,
                                                                                     self.principal_service)
        self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        
    def clean(self):
        clean_lock(self.competitive_lock_service, self.tenant_id)
        clean_record_executing_timeout(self.tenant_id, self.change_data_record_service, ask_collector_timeout())
        clean_json_executing_timeout(self.tenant_id, self.change_data_json_service, ask_collector_timeout())
        clean_task_executing_timeout(self.tenant_id, self.scheduled_task_service, ask_collector_timeout())
        clean_json_waiting_timeout(self.tenant_id,
                                   self.change_data_json_service,
                                   self.change_data_json_history_service,
                                   self.scheduled_task_service,
                                   ask_collector_task_timeout())
    
    def clean_self(self):
        clean_self(self.competitive_lock_service, self.tenant_id)


def get_clean_worker(tenant_id: str) -> CleanWorker:
    return CleanWorker(tenant_id)