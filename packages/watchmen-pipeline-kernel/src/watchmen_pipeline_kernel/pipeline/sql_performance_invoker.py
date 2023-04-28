import asyncio
from asyncio import ensure_future, run
from logging import getLogger
from typing import Callable

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.pipeline_kernel import PipelineTriggerTraceId
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_storage.sql_analysis.ast_vister import QueryPerformance
from . import create_monitor_log_pipeline_invoker
from .pipeline_trigger import PipelineTrigger

logger = getLogger(__name__)

def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic_schema(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise PipelineKernelException(
			f'Topic schema[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema


def create_sql_performance_pipeline_invoker(
		trace_id: PipelineTriggerTraceId, principal_service: PrincipalService
) -> Callable[[QueryPerformance, bool], None]:
	def handle_sql_performance_log(sql_performance_log: QueryPerformance, asynchronized: bool) -> None:
		schema = find_topic_schema('query_performance_log', principal_service)
		trigger = PipelineTrigger(
			trigger_topic_schema=schema,
			trigger_type=PipelineTriggerType.INSERT,
			trigger_data=sql_performance_log.dict(),
			trace_id=trace_id,
			principal_service=principal_service,
			asynchronized=asynchronized,
			handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
		)

		asyncio.create_task(trigger.invoke())


	return handle_sql_performance_log
