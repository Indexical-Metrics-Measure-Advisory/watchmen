from datetime import datetime
from typing import Dict

from watchmen_meta.common import ask_super_admin, ask_snowflake_generator
from .s3_storage import ask_log_storage


class FileLogService:
    
    def __init__(self):
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        
    def log_result(self, tenant_id: str, key: str, entity: Dict):
        log_storage = ask_log_storage(tenant_id)
        log_storage.upload_log_to_s3(key, entity)
    
    def load_state(self, tenant_id: str, key: str):
        state_storage = ask_log_storage(tenant_id)
        return state_storage.load_state(key)
    
    def save_state(self, tenant_id: str, key:str, entity: Dict):
        state_storage = ask_log_storage(tenant_id)
        state_storage.save_state(key, entity)
    
    def delete_state(self, tenant_id: str, key:str):
        state_storage = ask_log_storage(tenant_id)
        state_storage.delete_state(key)
        
    def log_record_to_json_message(self,
                                   tenant_id: str,
                                   event_trigger_id: str,
                                   entity: Dict):
        key = f'logs/{tenant_id}/{event_trigger_id}/record_to_json/{self.snowflake_generator.next_id()}'
        log_storage = ask_log_storage(tenant_id)
        log_storage.upload_log_to_s3(key, entity)
        
    def log_post_json_message(self,
                              tenant_id: str,
                              event_trigger_id: str,
                              entity: Dict):
        key = f'logs/{tenant_id}/{event_trigger_id}/post_json/{self.snowflake_generator.next_id()}'
        log_storage = ask_log_storage(tenant_id)
        log_storage.upload_log_to_s3(key, entity)
        
    def log_record_distributor_message(self,
                                       tenant_id: str,
                                       event_trigger_id: int,
                                       entity: Dict):
        current_hour = datetime.now().strftime("%Y-%m-%d/%H")
        key = f'logs/{tenant_id}/{event_trigger_id}/record_distributor/{current_hour}/{self.snowflake_generator.next_id()}'
        log_storage = ask_log_storage(tenant_id)
        log_storage.upload_log_to_s3(key, entity)
        
   
def ask_file_log_service() -> FileLogService:
    return FileLogService()
