import logging

from watchmen_serverless_lambda.model import ActionType, ActionMessage
from .record_worker import get_record_worker
from .table_worker import get_extract_table_worker

logger = logging.getLogger(__name__)


class CollectorWorker:

    def __init__(self, tenant_id: str, context):
        self.tenant_id = tenant_id
        self.table_worker = get_extract_table_worker(self.tenant_id, context)
        self.record_worker = get_record_worker(self.tenant_id)


    def receive_message(self, message: ActionMessage):
        if message.action == ActionType.EXTRACT_TABLE:
            self.table_worker.process_trigger_table(message.trigger_table)
        elif message.action == ActionType.SAVE_RECORD:
            self.table_worker.process_records(message.triggerTable, message.records)
        elif message.action == ActionType.BUILD_JSON:
            self.record_worker.process_change_data_record(message.records)
        elif message.action == ActionType.POST_JSON:
            pass
        elif message.action == ActionType.RUN_TASK:
            pass
        else:
            logger.warning(f"missing operation: {message}")
            

def get_collector_worker(tenant_id: str) -> CollectorWorker:
    return CollectorWorker(tenant_id)

