from datetime import datetime
from typing import Dict

from watchmen_collector_kernel.model import TriggerTable
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator
from .s3_storage import ask_log_storage


class FileLogService:
    
    def __init__(self):
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
    
    def log_trigger_table_message(self,
                                  tenant_id: str,
                                  trigger_event_id: str,
                                  trigger_table_id: str,
                                  entity: Dict):
        key = f'logs/{tenant_id}/{trigger_event_id}/trigger_table/{trigger_table_id}/{self.snowflake_generator.next_id()}'
        log_storage = ask_log_storage(tenant_id)
        log_storage.upload_log_to_s3(key, entity)
        
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
        

def ask_file_log_service() -> FileLogService:
    return FileLogService()
