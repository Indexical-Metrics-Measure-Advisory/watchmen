import logging
from typing import Optional

from watchmen_meta.common import ask_snowflake_generator
from watchmen_serverless_lambda.model import EventType
from watchmen_serverless_lambda.trigger import event_bridge_handler, s3_file_handler, \
	sqs_message_handler, url_trigger_handler
from watchmen_rest import RestSettings
from watchmen_rest.auth_helper import register_authentication_manager
from watchmen_rest.authentication import build_authentication_manager
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat



logger = logging.getLogger()
logger.setLevel(logging.INFO)

snowflake_generator = ask_snowflake_generator()


def write_worker_id_in_tmp(worker_id: int):
	with open('/tmp/worker_id.txt', 'w') as file:
		file.write(str(worker_id))


print(f"Serving WorkerIdReleaseExtension {snowflake_generator.workerId}")

write_worker_id_in_tmp(snowflake_generator.workerId)

# initial
settings = RestSettings()
register_authentication_manager(build_authentication_manager(
	settings, build_find_user_by_name(), build_find_user_by_pat(),
	[]
))


def main(event, context):
	print(f"Full event: {event}")
	if get_event_type(event) == EventType.EVENTBRIDGE:
		return event_bridge_handler(event, context)
	elif get_event_type(event) == EventType.FUNCTION_URL:
		return url_trigger_handler(event, context)
	elif get_event_type(event) == EventType.S3:
		return s3_file_handler(event, context)
	elif get_event_type(event) == EventType.SQS:
		return sqs_message_handler(event, context)
	else:
		logger.error("not support event: %s", event)
	

def get_event_type(event) -> Optional[EventType]:
	if (
			'listener' in event and
			'tenant_id' in event
	):
		return EventType.EVENTBRIDGE
	elif (
			'headers' in event and
			'requestContext' in event and
			'body' in event
	):
		return EventType.FUNCTION_URL
	elif (
		'Records' in event and
		len(event['Records']) >0
	):
		if event['Records'][0].get('eventSource') == 'aws:s3':
			return EventType.S3
		elif event['Records'][0].get('eventSource') == 'aws:sqs':
			return EventType.SQS