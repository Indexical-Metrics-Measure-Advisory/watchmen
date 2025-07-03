
import json
import logging
from enum import StrEnum

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
        detail = json.loads(event['detail'])
        if detail.get("listener", None) == ListenerType.EVENT:
            self.event_listener()
        else:
            logger.error("not support event: %s", event)
        logger.info("Full event: %s", event)
    
    except Exception as e:
        logger.error(e, exc_info=True, stack_info=True)