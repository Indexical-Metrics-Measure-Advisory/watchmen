import json
import logging

from watchmen_serverless_lambda.model import ActionType
from .collector_coordinator import get_collector_coordinator
from .collector_worker import get_collector_worker
from watchmen_serverless_lambda.model.message import ExtractTableMessage, SaveRecordMessage

logger = logging.getLogger(__name__)


class CollectorConsumer:
    
    def __init__(self, tenant_id: str, context):
        self.tenant_id = tenant_id
        self.collector_coordinator = get_collector_coordinator(self.tenant_id)
        self.collector_worker = get_collector_worker(self.tenant_id, context)
        
    def process_message(self, message):
        try:
            body = json.loads(message['body'])
            if body['action'] == ActionType.ASSIGN_RECORD:
                message = ExtractTableMessage(**body)
                self.collector_coordinator.receive_message(message)
            elif body['action'] == ActionType.ASSIGN_JSON:
                pass
            elif body['action'] == ActionType.ASSIGN_TASK:
                pass
            elif body['action'] == ActionType.EXTRACT_TABLE:
                message = ExtractTableMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.SAVE_RECORD:
                message = SaveRecordMessage(**body)
                self.collector_worker.receive_message(message)
            else:
                logger.error(f"invalidate message {message}")
        except Exception as err:
            logger.error("An error occurred", exc_info=True)
            raise err


def get_collector_consumer(tenant_id: str, context) -> CollectorConsumer:
    return CollectorConsumer(tenant_id, context)