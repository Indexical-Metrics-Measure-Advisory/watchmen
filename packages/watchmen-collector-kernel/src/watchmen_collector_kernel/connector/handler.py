
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin

from watchmen_model.pipeline_kernel import PipelineTriggerData
from watchmen_pipeline_kernel.pipeline import create_monitor_log_pipeline_invoker, PipelineTrigger


from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage


async def handle_trigger_data(trigger_data: PipelineTriggerData, topic_trigger: TopicTrigger) -> None:
	# use super admin
	principal_service = ask_super_admin()
	# change the tenant_id
	principal_service.tenantId = trigger_data.tenantId
	schema = TopicService(principal_service).find_schema_by_name(trigger_data.code, trigger_data.tenantId)
	trace_id = str(ask_snowflake_generator().next_id())
	await PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=trigger_data.triggerType,
		trigger_data=trigger_data.data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=False,
		handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
	).start(topic_trigger)


def save_topic_data(trigger_data: PipelineTriggerData) -> TopicTrigger:
	# use super admin
	principal_service = ask_super_admin()
	# change the tenant_id
	principal_service.tenantId = trigger_data.tenantId
	schema = TopicService(principal_service).find_schema_by_name(trigger_data.code, trigger_data.tenantId)
	if schema is None:
		raise Exception("schema is not not found. %s, %s", trigger_data.code, trigger_data.tenantId)
	data = schema.prepare_data(trigger_data.data, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	return service.trigger_by_insert(data)
