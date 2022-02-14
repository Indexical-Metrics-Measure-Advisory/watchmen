from watchmen_auth import PrincipalService
from watchmen_model.reactor import PipelineTriggerData, PipelineTriggerTraceId
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_reactor.topic_schema import TopicSchema
from .pipeline_context import PipelineContext


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise ReactorException(f'Schema of topic[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema


async def invoke(
		trigger_data: PipelineTriggerData,
		trace_id: PipelineTriggerTraceId, principal_service: PrincipalService,
		asynchronized: bool) -> None:
	if trigger_data.data is None:
		raise ReactorException(f'Trigger data is null.')

	schema = find_topic(trigger_data.code, principal_service)
	await PipelineContext(
		trigger_topic_schema=schema,
		trigger_type=trigger_data.triggerType,
		trigger_data=trigger_data.data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=asynchronized
	).run()


async def try_to_invoke_pipelines(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> None:
	await invoke(trigger_data, trace_id, principal_service, False)


async def try_to_invoke_pipelines_async(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> None:
	await invoke(trigger_data, trace_id, principal_service, True)
