from asyncio import ensure_future
from typing import Callable

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId
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


def create_monitor_log_pipeline_invoker(
		trace_id: PipelineTriggerTraceId, principal_service: PrincipalService
) -> Callable[[PipelineMonitorLog, bool], None]:
	def handle_monitor_log(monitor_log: PipelineMonitorLog, asynchronized: bool) -> None:
		schema = find_topic_schema('raw_pipeline_monitor_log', principal_service)
		ensure_future(PipelineTrigger(
			trigger_topic_schema=schema,
			trigger_type=PipelineTriggerType.INSERT,
			trigger_data=monitor_log.dict(),
			trace_id=trace_id,
			principal_service=principal_service,
			asynchronized=asynchronized,
			handle_monitor_log=handle_monitor_log
		).invoke())

	return handle_monitor_log
