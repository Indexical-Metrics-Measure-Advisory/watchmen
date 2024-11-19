import asyncio
from logging import getLogger
from typing import Callable

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import PipelineTriggerType, TopicKind
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId, MonitorLogStatus
from watchmen_pipeline_kernel.common import PipelineKernelException, ask_pipeline_error_handle_monitor_log
from watchmen_utilities import run
from .pipeline_trigger import PipelineTrigger

logger = getLogger(__name__)
logger.setLevel("ERROR")


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

	def is_logging_required(monitor_log: PipelineMonitorLog) -> bool:
		if ask_pipeline_error_handle_monitor_log():
			if monitor_log.status == MonitorLogStatus.ERROR:
				return True
			else:
				return False

		topic_service = get_topic_service(principal_service)
		topic = topic_service.find_by_id(monitor_log.topicId)
		if topic is None:
			return False
		else:
			if topic.kind == TopicKind.SYSTEM:
				return False
			else:
				return True

	def handle_monitor_log(monitor_log: PipelineMonitorLog, asynchronized: bool) -> None:
		if is_logging_required(monitor_log):
			schema = find_topic_schema('raw_pipeline_monitor_log', principal_service)
			trigger = PipelineTrigger(
				trigger_topic_schema=schema,
				trigger_type=PipelineTriggerType.INSERT,
				trigger_data=monitor_log.dict(),
				trace_id=trace_id,
				principal_service=principal_service,
				asynchronized=asynchronized,
				handle_monitor_log=handle_monitor_log
			)
			if asynchronized:
				asyncio.ensure_future(trigger.invoke())
			else:
				run(trigger.invoke())

	return handle_monitor_log
