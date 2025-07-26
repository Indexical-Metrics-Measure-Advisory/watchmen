import logging

from watchmen_serverless_lambda.service import CollectorListener

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def event_bridge_handler(event, context):
    try:
        listener = CollectorListener(event['tenant_id'], event['listener'])
        listener.listen()
    except Exception as e:
        logger.error(e, exc_info=True, stack_info=True)