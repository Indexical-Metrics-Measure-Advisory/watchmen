
import json
import logging

from watchmen_serverless_lambda.service import get_collector_consumer

logger = logging.getLogger("trigger-sqs")


def sqs_message_handler(event, context):
    for message in event['Records']:
        process_message(message)


def process_message(message, context):
    try:
        body = json.loads(message['body'])
        consumer = get_collector_consumer(body['tenantId'], context)
        consumer.process_message(message)
    except Exception as err:
        logger.error("An error occurred", exc_info=True)
        raise err
