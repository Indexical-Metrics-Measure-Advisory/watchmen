from typing import Any, Dict, Optional, List

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import PipelineService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import PipelineTriggerType, TopicKind, User, UserRole, Pipeline, \
	WriteFactorAction, AggregateArithmetic, InsertRowAction
from watchmen_model.admin.pipeline_action_write import InsertOrMergeRowAction, MergeRowAction
from watchmen_model.common import PipelineId, TenantId
from watchmen_model.dqc.monitor_result import PipelineMonitorResult
from watchmen_model.pipeline_kernel import PipelineTriggerResult, PipelineTriggerTraceId, PipelineMonitorLog
from watchmen_pipeline_kernel.monitor_log import PipelineMonitorLogDataService
from watchmen_pipeline_kernel.pipeline import create_monitor_log_pipeline_invoker, PipelineTrigger
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank, is_not_blank

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(principal_service)


# noinspection DuplicatedCode
def get_topic_schema(
		topic_name: str, tenant_id: Optional[TenantId], principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(topic_name, tenant_id)
	if schema is None:
		raise_404('Topic not found.')
	return schema


def validate_tenant_id(tenant_id: Optional[TenantId], principal_service: PrincipalService) -> TenantId:
	if principal_service.is_tenant_admin():
		if is_not_blank(tenant_id) and tenant_id != principal_service.get_tenant_id():
			raise_400('Tenant id is incorrect.')
		return principal_service.get_tenant_id()
	elif principal_service.is_super_admin():
		if is_blank(tenant_id):
			raise_400('Tenant id is required.')
		return tenant_id


def fake_to_tenant(principal_service: PrincipalService, tenant_id: TenantId) -> PrincipalService:
	if principal_service.is_super_admin():
		# fake principal as tenant admin
		return PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=tenant_id,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	else:
		return principal_service


async def start_pipeline(
		schema: TopicSchema, trace_id: PipelineTriggerTraceId, data_id: int,
		trigger_data: Dict[str, Any], previous_data: Optional[Dict[str, Any]],
		pipeline_id: Optional[PipelineId],
		principal_service: PrincipalService
) -> None:
	trigger_type = PipelineTriggerType.INSERT if previous_data is None else PipelineTriggerType.MERGE
	await PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=trigger_type,
		trigger_data=trigger_data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=False,
		handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
	).start(TopicTrigger(
		previous=previous_data,
		current=trigger_data,
		triggerType=trigger_type,
		internalDataId=data_id
	), pipeline_id)


def has_summary(pipeline: Pipeline) -> bool:
	for stage in pipeline.stages:
		for unit in stage.units:
			for action in unit.do:
				if isinstance(action, WriteFactorAction):
					if action.arithmetic != AggregateArithmetic.NONE:
						return True
				elif isinstance(action, InsertRowAction) or isinstance(action, InsertOrMergeRowAction) or isinstance(
						action, MergeRowAction):
					for mapping_factor in action.mapping:
						if mapping_factor.arithmetic != AggregateArithmetic.NONE:
							return True

	pass


@router.get('/topic/data/rerun', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineTriggerResult)
async def rerun_by_topic_data(
		topic_name: Optional[str] = None, topic_id: Optional[str] = None,
		data_id: Optional[int] = None, pipeline_id: Optional[PipelineId] = None,
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineTriggerResult:
	if is_blank(topic_name) and is_blank(topic_id):
		raise_400('Topic id or name is required.')
	if is_blank(data_id):
		raise_400('Data id is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	if is_not_blank(pipeline_id):
		pipeline_service = get_pipeline_service(principal_service)
		pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404('Pipeline not found.')
		if has_summary(pipeline):
			raise_400('Rerun by data id is not supported on summary pipeline.')

	# here is a problem, the only certain thing is data already in storage or not
	# has to find out the previous status of this data row, it is created by insert or merge?
	# to find out this, to find the last pipeline log for non-raw topic
	# for raw topic, always be treated as insert
	# find existing data now
	schema = await find_source_topic_schema(principal_service, tenant_id, topic_id, topic_name)

	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	existing_data = service.find_previous_data_by_id(id_=data_id, raise_on_not_found=True, close_storage=True)
	# unwrap it, but reserved columns should be kept
	unwrapped_data = service.try_to_unwrap_from_topic_data(existing_data)

	trace_id = str(ask_snowflake_generator().next_id())

	await start_pipeline(schema, trace_id, data_id, unwrapped_data, None, pipeline_id, principal_service)

	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(data_id))


async def find_source_topic_schema(principal_service, tenant_id, topic_id, topic_name):
	if is_not_blank(topic_id):
		schema = get_topic_service(principal_service).find_schema_by_id(topic_id, tenant_id)
	else:
		schema = get_topic_schema(topic_name, tenant_id, principal_service)
	if schema.get_topic().kind == TopicKind.SYNONYM:
		raise_400('Rerun by data id is not supported on synonym topic.')
	return schema


@router.get('/pipeline/log/rerun/uid', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineTriggerResult)
async def rerun_with_uid(uid:str,principal_service: PrincipalService = Depends(get_any_admin_principal)):
	log_data, trace_id = await rerun_monitor_log(principal_service, uid)
	return PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(log_data.dataId),logId=uid)


async def rerun_monitor_log(principal_service, uid):
	pipeline_data_service = PipelineMonitorLogDataService(principal_service)
	log_data: PipelineMonitorLog = pipeline_data_service.find_error_log_with_uid(uid)
	if log_data is None:
		raise_404('Log not found.')
	trace_id = str(ask_snowflake_generator().next_id())
	schema = await find_source_topic_schema(principal_service, log_data.tenant_id_, log_data.topicId, None)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	unwrapped_data = service.try_to_unwrap_from_topic_data(log_data.newValue)
	await start_pipeline(schema, trace_id, log_data.dataId, unwrapped_data, log_data.oldValue, log_data.pipelineId,
	                     principal_service)
	return log_data, trace_id


@router.post('/pipeline/log/rerun/error', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[PipelineTriggerResult])
async def rerun_with_error_log(error_log:PipelineMonitorResult,principal_service: PrincipalService = Depends(get_any_admin_principal)):
	rerun_result_list = []

	if len(error_log.errorDetails) > 2000:
		raise_400("Too many error logs to rerun, please seplit them into multiple requests.")


	for error_detail in error_log.errorDetails:
		log_data, trace_id = await rerun_monitor_log(principal_service, error_detail["uid"])
		rerun_result_list.append(PipelineTriggerResult(received=True, traceId=trace_id, internalDataId=str(log_data.dataId), logId=error_detail["uid"]))

	return rerun_result_list

