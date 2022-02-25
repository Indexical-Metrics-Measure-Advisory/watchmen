from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.pipeline_kernel import PipelineTriggerData, PipelineTriggerTraceId
from watchmen_pipeline_kernel.common import PipelineKernelException
from .pipeline_trigger import PipelineTrigger


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic_schema(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise PipelineKernelException(
			f'Topic schema[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema


async def invoke(
		trigger_data: PipelineTriggerData,
		trace_id: PipelineTriggerTraceId, principal_service: PrincipalService,
		asynchronized: bool) -> int:
	if trigger_data.data is None:
		raise PipelineKernelException(f'Trigger data is null.')

	schema = find_topic_schema(trigger_data.code, principal_service)
	return await PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=trigger_data.triggerType,
		trigger_data=trigger_data.data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=asynchronized
	).invoke()


async def try_to_invoke_pipelines(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	return await invoke(trigger_data, trace_id, principal_service, False)


async def try_to_invoke_pipelines_async(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	return await invoke(trigger_data, trace_id, principal_service, True)
