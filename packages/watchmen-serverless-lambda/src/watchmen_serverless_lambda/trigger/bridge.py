
import json
import logging
from enum import StrEnum

from watchmen_serverless_lambda.service import EventListener, TableExtractorListener

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class ListenerType(StrEnum):
    EVENT = "event"
    TABLE = "table"
    RECORD = "record"
    JSON = "json"
    TASK = "task"
 

def event_bridge_handler(event, context):
    try:
        if event.get("listener", None) == ListenerType.EVENT:
            listener = EventListener(event['tenant_id'])
            listener.event_listener()
        elif event.get("listener", None) == ListenerType.TABLE:
            listener = TableExtractorListener(event['tenant_id'])
            listener.trigger_table_listener()
        else:
            logger.error("not support event: %s", event)
        logger.info("Full event: %s", event)
    
    except Exception as e:
        logger.error(e, exc_info=True, stack_info=True)