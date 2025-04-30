import json
import asyncio
from watchmen_utilities import is_blank
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager, RestSettings
from watchmen_rest.auth_helper import register_authentication_manager
from watchmen_rest.authentication import build_authentication_manager

snowflake_generator = ask_snowflake_generator()


def write_worker_id_in_tmp(worker_id: int):
	with open('/tmp/worker_id.txt', 'w') as file:
		file.write(str(worker_id))


print(f"Serving WorkerIdReleaseExtension {snowflake_generator.workerId}")

write_worker_id_in_tmp(snowflake_generator.workerId)


def main(event, context):
	try:
		headers = event['headers']
		token = headers.get("authorization").split(" ")[1]
		body = event['body']
		topic_event = json.loads(body)
		code = topic_event.get("code")
		data = topic_event.get('data')

		settings = RestSettings()
		register_authentication_manager(build_authentication_manager(
			settings, build_find_user_by_name(), build_find_user_by_pat(),
			[]
		))

		trigger_data = PipelineTriggerDataWithPAT(
			pat=token, code=code, data=data)

		pat = trigger_data.pat

		if is_blank(pat):
			raise Exception('PAT not found.')

		principal_service = get_principal_by_pat(
			retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])

		trace_id: PipelineTriggerTraceId = str(
			ask_snowflake_generator().next_id())

		internal_data_id = asyncio.run(try_to_invoke_pipelines(
			trigger_data, trace_id, principal_service))

		return {
			'statusCode': 200,
			'body': {"received": True, "traceId": trace_id, "internalDataId": str(internal_data_id)}
		}

	except Exception as e:
		raise e
