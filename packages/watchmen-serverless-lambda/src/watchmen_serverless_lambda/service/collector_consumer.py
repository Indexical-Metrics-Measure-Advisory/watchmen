import json
import logging

from watchmen_meta.common import ask_snowflake_generator
from watchmen_serverless_lambda.model import ActionType, AssignTaskMessage, ScheduledTaskMessage, PostGroupedJSONMessage
from .collector_coordinator import get_collector_coordinator
from .collector_worker import get_collector_worker
from watchmen_serverless_lambda.model.message import ExtractTableMessage, SaveRecordMessage, BuildJSONMessage, \
    AssignRecordMessage, AssignJsonMessage, PostJSONMessage, PostObjectIdMessage
from watchmen_serverless_lambda.storage import ask_file_log_service
from watchmen_serverless_lambda.common import log_error

logger = logging.getLogger(__name__)


class CollectorConsumer:
    
    def __init__(self, tenant_id: str, context):
        self.tenant_id = tenant_id
        self.snowflake_generator = ask_snowflake_generator()
        self.collector_coordinator = get_collector_coordinator(self.tenant_id, context)
        self.collector_worker = get_collector_worker(self.tenant_id, context)
        self.log_service = ask_file_log_service()
        
    def process_message(self, message):
        try:
            body = json.loads(message['body'])
            if body['action'] == ActionType.ASSIGN_RECORD:
                message = AssignRecordMessage(**body)
                self.collector_coordinator.receive_message(message)
            elif body['action'] == ActionType.ASSIGN_JSON:
                message = AssignJsonMessage(**body)
                self.collector_coordinator.receive_message(message)
            elif body['action'] == ActionType.ASSIGN_TASK:
                message = AssignTaskMessage(**body)
                self.collector_coordinator.receive_message(message)
            elif body['action'] == ActionType.EXTRACT_TABLE:
                message = ExtractTableMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.SAVE_RECORD:
                message = SaveRecordMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.BUILD_JSON:
                message = BuildJSONMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.POST_JSON:
                message = PostJSONMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.POST_OBJECT_ID:
                message = PostObjectIdMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.POST_GROUP_JSON:
                message = PostGroupedJSONMessage(**body)
                self.collector_worker.receive_message(message)
            elif body['action'] == ActionType.RUN_TASK:
                message = ScheduledTaskMessage(**body)
                self.collector_worker.receive_message(message)
            else:
                logger.error(f"invalidate message {message}")
        except Exception as err:
            error_key = f"error/{self.tenant_id}/consumer/{self.snowflake_generator.next_id()}"
            log_error(self.tenant_id, self.log_service, error_key, err)


def get_collector_consumer(tenant_id: str, context) -> CollectorConsumer:
    return CollectorConsumer(tenant_id, context)