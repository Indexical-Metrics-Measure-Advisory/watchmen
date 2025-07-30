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
from watchmen_serverless_lambda.service.json.json_coordinator import get_json_coordinator
from watchmen_serverless_lambda.service.record.record_coordinator import get_record_coordinator
from .task import get_task_coordinator
from .time_manager import get_lambda_time_manager
from watchmen_serverless_lambda.storage import ask_file_log_service

logger = logging.getLogger(__name__)


class CollectorCoordinator:
    
    def __init__(self, tenant_id: str, context):
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
        self.time_manger = get_lambda_time_manager(context)
        self.record_coordinator = get_record_coordinator(tenant_id)
        self.json_coordinator = get_json_coordinator(tenant_id, context)
        self.task_coordinator = get_task_coordinator(tenant_id)
    
    def receive_message(self, message: ActionMessage):
        if message.action == ActionType.ASSIGN_RECORD:
            self.assign(message.action, message.triggerEvent)
        elif message.action == ActionType.ASSIGN_JSON:
            self.json_coordinator.assign(message.triggerEvent)
        elif message.action == ActionType.ASSIGN_TASK:
            self.assign(message.action, message.triggerEvent)
        
    def assign(self, action: ActionType, trigger_event: TriggerEvent):
        while self.time_manger.is_safe:
            unfinished_rows = self.ask_assign_rows(action, trigger_event)
            
            if not unfinished_rows:
                break
                
            successes, failures = self.send_worker_messages(trigger_event, action, unfinished_rows)
            log_entity = {
                'successes': successes,
                'failures': failures
            }
            self.log_service.log_result(self.tenant_id, self.ask_log_key(action, trigger_event), log_entity)
        
    def ask_log_key(self, action: str, trigger_event: TriggerEvent) -> str:
        key = f'logs/{self.tenant_id}/{trigger_event.eventTriggerId}/{action}/{self.snowflake_generator.next_id()}'
        return key
    
    def ask_assign_rows(self, action: ActionType, trigger_event: TriggerEvent) -> Optional[List]:
        if action == ActionType.ASSIGN_RECORD:
            return self.record_coordinator.ask_assign_rows(trigger_event)
        elif action == ActionType.ASSIGN_JSON:
            pass
        elif action == ActionType.ASSIGN_TASK:
            return self.task_coordinator.ask_assign_rows(trigger_event)
    
    def send_worker_messages(self, trigger_event: TriggerEvent, action: ActionType, records: List) -> Tuple[Dict, Dict]:
        batch_size: int = self.ask_batch_size(action)
        messages = []
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            message = {
                'Id': str(self.snowflake_generator.next_id()),
                'MessageBody': self.ask_worker_message_body(trigger_event, action, batch)
            }
            messages.append(message)
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
    
    def ask_batch_size(self, action: ActionType) -> int:
        if action == ActionType.ASSIGN_RECORD:
            return ask_serverless_record_batch_size()
        elif action == ActionType.ASSIGN_JSON:
            pass
        elif action == ActionType.ASSIGN_TASK:
            return self.task_coordinator.ask_message_batch_size()
        else:
            return 10
    
    def ask_worker_message_body(self, trigger_event: TriggerEvent, action: ActionType, batch: List) -> str:
        if action == ActionType.ASSIGN_RECORD:
            return self.record_coordinator.ask_assign_record_message_body(trigger_event,
                                                                          batch)
        elif action == ActionType.ASSIGN_JSON:
            pass
        elif action == ActionType.ASSIGN_TASK:
            return self.task_coordinator.ask_assign_task_message_body(trigger_event,
                                                                        batch)
        else:
            logger.warning(f"missing action: {action}")


def get_collector_coordinator(tenant_id: str, context) -> CollectorCoordinator:
    return CollectorCoordinator(tenant_id, context)