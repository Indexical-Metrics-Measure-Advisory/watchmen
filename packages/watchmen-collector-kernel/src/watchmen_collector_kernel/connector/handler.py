from watchmen_meta.common import ask_snowflake_generator

from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines_skip_save_trigger_data
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager

from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_model.admin import UserRole
from watchmen_utilities import is_blank


async def handle_trigger_data(trigger_data: PipelineTriggerDataWithPAT) -> None:
	pat = trigger_data.pat
	if is_blank(pat):
		raise Exception('PAT not found.')
	principal_service = get_principal_by_pat(
		retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])

	trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
	await try_to_invoke_pipelines_skip_save_trigger_data(trigger_data, trace_id, principal_service)


def save_topic_data(trigger_data: PipelineTriggerDataWithPAT) -> None:
	topic_name = trigger_data.code
	pat = trigger_data.pat
	data = trigger_data.data
	if is_blank(pat):
		raise Exception('PAT not found.')
	principal_service = get_principal_by_pat(
		retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
	tenant_id = principal_service.get_tenant_id()
	schema = TopicService(principal_service).find_schema_by_name(topic_name, tenant_id)
	data = schema.prepare_data(data, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	service.trigger_by_insert(data)
