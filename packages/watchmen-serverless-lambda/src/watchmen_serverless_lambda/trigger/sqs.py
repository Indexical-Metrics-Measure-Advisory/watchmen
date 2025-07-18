
import json
import logging

from watchmen_serverless_lambda.model import TableExtractorMessage, ActionType, RecordToJSONMessage
from watchmen_serverless_lambda.service import process_table_extractor_message, process_record_to_json_message

logger = logging.getLogger("trigger-sqs")


def sqs_message_handler(event, context):
    for message in event['Records']:
        process_message(message)


def process_message(message):
    try:
        body = json.loads(message['body'])
        if body['action'] == ActionType.TABLE_EXTRACTOR:
            message = TableExtractorMessage(**body)
            process_table_extractor_message(message)
        elif body['action'] == ActionType.RECORD_TO_JSON:
            message = RecordToJSONMessage(**body)
            process_record_to_json_message(message)
        else:
            pass
    except Exception as err:
        logger.error("An error occurred", exc_info=True)
        raise err
