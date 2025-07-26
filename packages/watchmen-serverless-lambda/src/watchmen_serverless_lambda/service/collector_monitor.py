from watchmen_collector_kernel.model import TriggerEvent
from watchmen_serverless_lambda.service.event import get_reconciliation
from watchmen_serverless_lambda.storage import ask_file_log_service


class CollectorMonitor:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.reconciliation = get_reconciliation(self.tenant_id)
        self.log_service = ask_file_log_service()
        
    def monitor_trigger_event(self, key: str):
        event = self.log_service.load_state(key)
        self.reconciliation.reconciled(TriggerEvent(**event))
    
def get_collector_monitor(tenant_id: str) -> CollectorMonitor:
    return CollectorMonitor(tenant_id)