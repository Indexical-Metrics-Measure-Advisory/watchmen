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
        
        
def ask_file_log_service() -> FileLogService:
    return FileLogService()
