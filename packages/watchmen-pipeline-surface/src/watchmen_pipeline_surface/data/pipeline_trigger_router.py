from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerData, PipelineTriggerResult
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines, try_to_invoke_pipelines_async, \
	try_to_invoke_pipelines_full_async, try_to_invoke_pipelines_full_async_background, \
	try_to_invoke_pipelines_sync
from watchmen_rest import get_any_admin_principal
from watchmen_utilities import is_not_blank

router = APIRouter()


@router.post('/pipeline/data', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineTriggerResult)
def trigger_pipeline(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	# Sync route: FastAPI dispatches `def` handlers to a thread pool, so the
	# synchronous pipeline chain runs without blocking the event loop.
	trace_id = trigger_data.traceId if is_not_blank(trigger_data.traceId) else str(ask_snowflake_generator().next_id())
	internal_data_id = try_to_invoke_pipelines_sync(trigger_data, trace_id, principal_service)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(internal_data_id))


@router.post('/pipeline/data/async', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineTriggerResult)
async def trigger_pipeline_async(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	trace_id = trigger_data.traceId if is_not_blank(trigger_data.traceId) else str(ask_snowflake_generator().next_id())
	internal_data_id = await try_to_invoke_pipelines_async(trigger_data, trace_id, principal_service)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(internal_data_id))


@router.post('/pipeline/data/full-async', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=PipelineTriggerResult)
async def trigger_pipeline_full_async(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	"""
	Fully-async pipeline trigger: trigger-data storage and the whole dispatch chain use
	async data services (asyncpg/aiomysql), so the event loop is never blocked by DB I/O.
	Contrast with /pipeline/data which drives synchronous storage on the event loop.
	"""
	trace_id = trigger_data.traceId if is_not_blank(trigger_data.traceId) else str(ask_snowflake_generator().next_id())
	internal_data_id = await try_to_invoke_pipelines_full_async(trigger_data, trace_id, principal_service)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(internal_data_id))


@router.post('/pipeline/data/full-async/background', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=PipelineTriggerResult)
async def trigger_pipeline_full_async_background(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	"""
	Fully-async pipeline trigger with background dispatch: trigger-data is saved inline
	(awaited), then the downstream pipeline chain is pushed to a thread pool via
	run_in_executor so the HTTP response can return immediately.
	"""
	trace_id = trigger_data.traceId if is_not_blank(trigger_data.traceId) else str(ask_snowflake_generator().next_id())
	internal_data_id = await try_to_invoke_pipelines_full_async_background(trigger_data, trace_id, principal_service)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(internal_data_id))
