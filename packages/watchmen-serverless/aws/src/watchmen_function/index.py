import logging
import json
import sys
import urllib.parse
import boto3
import asyncio
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager, RestSettings
from watchmen_rest.auth_helper import register_authentication_manager
from watchmen_rest.authentication import build_authentication_manager
from watchmen_utilities import is_blank


logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.client('s3')


def handler(event, context):

	bucket = event['Records'][0]['s3']['bucket']['name']
	key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
	try:
		response = s3.get_object(Bucket=bucket, Key=key)
		raw_event = response['Body'].read()
	except Exception as e:
		logger.error(f'Error getting object {key} from bucket {bucket}. \
		Make sure they exist and your bucket is in the same region as this function.')
		raise e

	topic_event = json.loads(raw_event)
	settings = RestSettings()
	register_authentication_manager(build_authentication_manager(settings, build_find_user_by_name(), build_find_user_by_pat(), []))
	trigger_data = PipelineTriggerDataWithPAT(pat=topic_event.get('pat'), code=topic_event.get('code'), data=topic_event.get('data'))
	pat = trigger_data.pat
	if is_blank(pat):
		raise Exception('PAT Not Found.')
	principal_service = get_principal_by_pat(retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
	trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
	asyncio.run(try_to_invoke_pipelines(trigger_data, trace_id, principal_service))
	logging.info('Successfully invoke handler')

	return {'statusCode': 200, 'body': event}

