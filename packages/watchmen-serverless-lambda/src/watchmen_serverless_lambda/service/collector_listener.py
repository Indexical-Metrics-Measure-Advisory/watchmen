import json
import logging
from collections.abc import Callable
from typing import Dict, Tuple, Optional

from watchmen_collector_kernel.model import TriggerEvent
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_record_service, \
    get_trigger_event_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_serverless_lambda.common import ask_serverless_queue_url
from watchmen_serverless_lambda.storage import ask_file_log_service
from watchmen_serverless_lambda.model import ActionType, ListenerType
from watchmen_serverless_lambda.queue import SQSSender
from .event_listener import EventListener
from .record_listener import get_record_listener
from .table_listener import get_table_listener

logger = logging.getLogger(__name__)


class CollectorListener:
    
    def __init__(self, tenant_id: str, listener_type: ListenerType):
        self.tenant_id = tenant_id
        self.listener_type = listener_type
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.trigger_event_service = get_trigger_event_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
        self.log_service = ask_file_log_service()
        self.sender = SQSSender(queue_url=ask_serverless_queue_url(),
                                max_retries=3,
                                base_delay=0.5)
        self.table_listener = get_table_listener(self.tenant_id)
        self.record_listener = get_record_listener(self.tenant_id)

    def listen(self):
        if self.listener_type == ListenerType.EVENT:
            listener = EventListener(self.tenant_id)
            listener.event_listener()
        else:
            trigger_event = self.get_executing_trigger_event(self.tenant_id)
            if trigger_event:
                if self.listener_type == ListenerType.TABLE:
                    action = ActionType.EXTRACT_TABLE
                elif self.listener_type == ListenerType.RECORD:
                    action = ActionType.ASSIGN_RECORD
                else:
                    pass
                count = self.ask_number_of_coordinators(trigger_event)
                if count > 0:
                    self.ask_coordinators(count, action, trigger_event, self.send_coordinator_messages)
    
    def get_executing_trigger_event(self, tenant_id: str) -> Optional[TriggerEvent]:
        return self.trigger_event_service.find_executing_event_by_tenant_id(tenant_id)
    
    def ask_number_of_coordinators(self, trigger_event: TriggerEvent) -> Optional[int]:
        if self.listener_type == ListenerType.TABLE:
            return self.table_listener.ask_number_of_coordinators(trigger_event)
        elif self.listener_type == ListenerType.RECORD:
            return self.record_listener.ask_number_of_coordinators(trigger_event)
        else:
            pass
            
    def ask_coordinators(self, count: int, action:ActionType, trigger_event,
                         send_messages: Callable[[int, ActionType, TriggerEvent], Tuple[Dict, Dict]]):
        successes, failures = send_messages(count, action, trigger_event)
        log_entity = {
            'successes': successes,
            'failures': failures
        }
        self.log_service.log_result(self.tenant_id, self.ask_log_key(trigger_event), log_entity)
    
    def send_coordinator_messages(self, count: int, action: ActionType, trigger_event: TriggerEvent) -> Tuple[Dict, Dict]:
        messages = []
        for i in range(count):
            message = {
                'Id': self.snowflake_generator.next_id(),
                'MessageBody': json.dumps({'action': action,
                                           'tenantId': self.tenant_id,
                                           'triggerEvent': trigger_event}),
                'MessageGroupId': self.snowflake_generator.next_id(),
                'MessageDeduplicationId': self.snowflake_generator.next_id()
            }
            messages.append(message)
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
            
    def ask_log_key(self, trigger_event: TriggerEvent) -> str:
        key = f'logs/{self.tenant_id}/{trigger_event.eventTriggerId}/{self.listener_type.value}/{self.snowflake_generator.next_id()}'
        return key


def get_collector_listener(tenant_id: str, listener_type: ListenerType) -> CollectorListener:
    return CollectorListener(tenant_id, listener_type)
