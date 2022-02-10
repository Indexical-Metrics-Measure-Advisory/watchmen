from watchmen_auth import PrincipalService
from watchmen_model.reactor import PipelineTriggerData, PipelineTriggerTraceId


async def try_to_invoke_pipelines(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> None:
	# TODO trigger pipelines
	pass
