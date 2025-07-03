from datetime import datetime
from typing import Dict

from watchmen_collector_kernel.model import TriggerTable
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator
from .s3_storage import ask_log_storage


class FileLogService:
    
    def __init__(self):
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
    
    def log_trigger_table_message(self, trigger_table: TriggerTable, entity: Dict):
        key = f'logs/{trigger_table.eventTriggerId}/trigger_table/{trigger_table.tableTriggerId}/{self.snowflake_generator.next_id()}'
        log_storage = ask_log_storage(trigger_table.tenantId)
        log_storage.upload_log_to_s3(key, entity)

def ask_file_log_service() -> FileLogService:
    return FileLogService()
