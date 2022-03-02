from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager
from watchmen_utilities import is_blank


async def handle_trigger_data(trigger_data: PipelineTriggerDataWithPAT) -> None:
	# TODO should log trigger data
	pat = trigger_data.pat
	if is_blank(pat):
		raise Exception('PAT not found.')
	principal_service = get_principal_by_pat(
		retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])

	trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
	await try_to_invoke_pipelines(trigger_data, trace_id, principal_service)
