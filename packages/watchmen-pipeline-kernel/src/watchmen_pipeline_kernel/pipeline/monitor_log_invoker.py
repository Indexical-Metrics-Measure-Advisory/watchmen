import asyncio
from concurrent.futures import ThreadPoolExecutor
from logging import getLogger
from threading import BoundedSemaphore
from typing import Callable

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import PipelineTriggerType, TopicKind
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId, MonitorLogStatus
from watchmen_pipeline_kernel.common import PipelineKernelException, ask_pipeline_error_handle_monitor_log
from .pipeline_trigger import PipelineTrigger

logger = getLogger(__name__)
logger.setLevel("ERROR")

# Monitor-log invocations on non-event-loop threads are offloaded to this pool so
# the request path does not pay the monitor-log latency (mirroring the
# fire-and-forget behavior the event-loop path always had). Both workers and
# queued invocations are capped: monitor-log writes are short inserts, and under
# sustained overload callers fall back to inline execution (backpressure) instead
# of dropping the log or growing memory unboundedly.
_monitor_log_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix='monitor-log')
_monitor_log_slots = BoundedSemaphore(100)


def _invoke_monitor_log_in_background(trigger: PipelineTrigger) -> None:
	try:
		trigger.invoke_sync()
	except Exception:
		# A monitor-log failure must never fail the triggering record; the
		# fire-and-forget event-loop path never propagated it either.
		logger.error('Failed to invoke monitor log pipeline in background.', exc_info=True)
	finally:
		_monitor_log_slots.release()


def _submit_monitor_log(trigger: PipelineTrigger) -> bool:
	"""
	Submit the monitor-log invocation to the background pool. Returns False when
	the pool is saturated and the caller should run it inline instead.
	"""
	if not _monitor_log_slots.acquire(blocking=False):
		return False
	try:
		_monitor_log_executor.submit(_invoke_monitor_log_in_background, trigger)
		return True
	except Exception:
		_monitor_log_slots.release()
		return False


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
				try:
					asyncio.get_running_loop()
					# We are inside a running event loop, fire-and-forget is safe.
					asyncio.ensure_future(trigger.invoke())
				except RuntimeError:
					# No running event loop in this thread (e.g. FastAPI `def` route
					# runs in an AnyIO worker thread). Offload to the background pool
					# so the request path does not pay the monitor-log latency; when
					# the pool is saturated, run inline so the log is still not lost.
					if not _submit_monitor_log(trigger):
						trigger.invoke_sync()
			else:
				# Pure synchronous path; no need for the run() thread-pool bridge.
				trigger.invoke_sync()

	return handle_monitor_log
