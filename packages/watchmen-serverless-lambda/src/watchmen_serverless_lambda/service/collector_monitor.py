from watchmen_collector_kernel.model import TriggerEvent
from watchmen_meta.common import ask_snowflake_generator
from watchmen_serverless_lambda.common import log_error
from watchmen_serverless_lambda.service.event import get_reconciliation
from watchmen_serverless_lambda.storage import ask_file_log_service


class CollectorMonitor:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.snowflake_generator = ask_snowflake_generator()
        self.reconciliation = get_reconciliation(self.tenant_id)
        self.log_service = ask_file_log_service()
        
    def monitor_trigger_event(self, key: str):
        try:
            event = self.log_service.load_state(self.tenant_id, key)
            self.reconciliation.reconciled(TriggerEvent(**event))
        except Exception as e:
            error_key = f"error/{self.tenant_id}/monitor/{self.snowflake_generator.next_id()}"
            log_error(self.tenant_id, ask_file_log_service(), error_key, e)
    
def get_collector_monitor(tenant_id: str) -> CollectorMonitor:
    return CollectorMonitor(tenant_id)