from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerData, PipelineTriggerResult
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines, try_to_invoke_pipelines_async
from watchmen_rest import get_any_admin_principal
from watchmen_utilities import is_not_blank

router = APIRouter()


@router.post('/pipeline/data', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineTriggerResult)
async def trigger_pipeline(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	# use given trace id or generate new one
	trace_id = trigger_data.traceId if is_not_blank(trigger_data.traceId) else str(ask_snowflake_generator().next_id())
	internal_data_id = await try_to_invoke_pipelines(trigger_data, trace_id, principal_service)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(internal_data_id))


@router.post('/pipeline/data/async', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineTriggerResult)
async def trigger_pipeline_async(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	trace_id = trigger_data.traceId if is_not_blank(trigger_data.traceId) else str(ask_snowflake_generator().next_id())
	internal_data_id = await try_to_invoke_pipelines_async(trigger_data, trace_id, principal_service)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(internal_data_id))
