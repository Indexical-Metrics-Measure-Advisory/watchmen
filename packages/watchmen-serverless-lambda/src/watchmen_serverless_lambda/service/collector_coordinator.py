import json
import logging
from typing import Dict, Tuple, Optional, List

from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_record_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_serverless_lambda.common import ask_serverless_queue_url, \
    ask_serverless_record_batch_size
from watchmen_serverless_lambda.model import ActionType, ActionMessage
from watchmen_serverless_lambda.queue import SQSSender
from watchmen_serverless_lambda.storage import ask_file_log_service

logger = logging.getLogger(__name__)


class CollectorCoordinator:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
        self.log_service = ask_file_log_service()
        self.sender = SQSSender(queue_url=ask_serverless_queue_url(),
                                max_retries=3,
                                base_delay=0.5)
    
    def receive_message(self, message: ActionMessage):
        if message.action == ActionType.ASSIGN_RECORD:
            self.assign(message.action, message.triggerEvent)
        elif message.action == ActionType.ASSIGN_JSON:
            pass
        elif message.action == ActionType.ASSIGN_TASK:
            pass
        else:
            logger.warning(f"missing operation: {message}")
        
    
    def assign(self, action: ActionType, trigger_event: TriggerEvent):
        unfinished_records = self.ask_assign_records(action, trigger_event)
        if unfinished_records:
            successes, failures = self.send_worker_messages(action, unfinished_records)
            log_entity = {
                'successes': successes,
                'failures': failures
            }
            self.log_service.log_result(self.tenant_id, self.ask_log_key(action, trigger_event), log_entity)
    
    def ask_log_key(self, action: ActionType, trigger_event: TriggerEvent) -> str:
        key = f'logs/{self.tenant_id}/{trigger_event.eventTriggerId}/{action.value}/{self.snowflake_generator.next_id()}'
        return key
    
    def ask_assign_records(self, action: ActionType, trigger_event: TriggerEvent) -> Optional[List]:
        if action == ActionType.ASSIGN_RECORD:
            return self.find_records_and_locked_by_trigger_event_id(trigger_event)
    
    def send_worker_messages(self, action: ActionType, records: List) -> Tuple[Dict, Dict]:
        batch_size: int = self.ask_batch_size(action)
        messages = []
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            message = {
                'Id': str(self.snowflake_generator.next_id()),
                'MessageBody': self.ask_worker_message_body(action, batch),
                'MessageGroupId': str(self.snowflake_generator.next_id()),
                'MessageDeduplicationId': str(self.snowflake_generator.next_id())
            }
            messages.append(message)
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
    
    def ask_batch_size(self, action: ActionType) -> int:
        if action == ActionType.ASSIGN_RECORD:
            return ask_serverless_record_batch_size()
        else:
            return 10
    
    def ask_worker_message_body(self, action: ActionType, batch: List) -> str:
        if action == ActionType.ASSIGN_RECORD:
            return self.ask_assign_record_message_body(batch)
        else:
            logger.warning(f"missing action: {action}")


def get_collector_coordinator(tenant_id: str) -> CollectorCoordinator:
    return CollectorCoordinator(tenant_id)