from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines_full_async, try_to_invoke_pipelines_sync
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager
from watchmen_utilities import is_blank


async def handle_trigger_data(trigger_data: PipelineTriggerDataWithPAT) -> None:
	"""
	Handles a pipeline trigger received from an async connector (Kafka/RabbitMQ).

	By default this drives the synchronous storage layer on the event loop (historical
	behaviour). When the full-async storage packages are installed
	(watchmen-storage-postgresql-async / watchmen-storage-mysql-async), set
	PIPELINE_FULL_ASYNC_TRIGGER=true to route through try_to_invoke_pipelines_full_async,
	which uses async data services end to end and never blocks the event loop.
	"""
	# TODO should log trigger data
	pat = trigger_data.pat
	if is_blank(pat):
		raise Exception('PAT not found.')
	principal_service = get_principal_by_pat(
		retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])

	trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
	if _use_full_async():
		await try_to_invoke_pipelines_full_async(trigger_data, trace_id, principal_service)
	else:
		# Synchronous pipeline chain; no await needed.
		try_to_invoke_pipelines_sync(trigger_data, trace_id, principal_service)


def _use_full_async() -> bool:
	"""Read the full-async trigger toggle lazily. Only ImportError (settings moved
	or the extra not installed) silently degrades to sync; any other failure is a
	real misconfiguration that should surface, so we re-raise it."""
	try:
		from watchmen_pipeline_surface.settings import ask_pipeline_full_async_trigger
	except ImportError:
		return False
	return ask_pipeline_full_async_trigger()
