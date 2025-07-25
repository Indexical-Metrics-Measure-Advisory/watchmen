import logging
from enum import StrEnum

from watchmen_serverless_lambda.service import CollectorListener

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
        listener = CollectorListener(event['tenant_id'], event['listener'])
        listener.listen()
    except Exception as e:
        logger.error(e, exc_info=True, stack_info=True)