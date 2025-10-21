
import json
import logging

from watchmen_serverless_lambda.common import set_mdc_tenant
from watchmen_serverless_lambda.service import get_collector_consumer

logger = logging.getLogger("trigger-sqs")


def sqs_message_handler(event, context):
    for message in event['Records']:
        process_message(message, context)


def process_message(message, context):
    try:
        body = json.loads(message['body'])
        set_mdc_tenant(body['tenantId'])
        consumer = get_collector_consumer(body['tenantId'], context)
        consumer.process_message(message)
    except Exception as err:
        logger.error(err, exc_info=True, stack_info=True)
        
