import logging
import json

import azure.functions as func
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


def handler(myblob: func.InputStream):
	event = myblob.read()
	evt = json.loads(event)
	
	settings = RestSettings()
	register_authentication_manager(build_authentication_manager(
		settings, build_find_user_by_name(), build_find_user_by_pat(),
		[]
	))
	
	trigger_data = PipelineTriggerDataWithPAT(pat=evt.get('pat'), code=evt.get('code'), data=evt.get('data'))
	pat = trigger_data.pat
	if is_blank(pat):
		raise Exception('PAT Not Found.')
	
	principal_service = get_principal_by_pat(
		retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
	
	trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
	asyncio.run(try_to_invoke_pipelines(trigger_data, trace_id, principal_service))
	
	logging.info('Successfully invoke handler')
