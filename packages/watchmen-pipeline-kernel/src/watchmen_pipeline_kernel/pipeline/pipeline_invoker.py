from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TenantService, TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import User, UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerData, PipelineTriggerTraceId
from watchmen_model.system import Tenant
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_utilities import is_blank, is_not_blank
from .monitor_log_invoker import create_monitor_log_pipeline_invoker
from .pipeline_trigger import PipelineTrigger


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(principal_service)


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
	
	if principal_service.is_super_admin():
		if is_blank(trigger_data.tenantId):
			raise Exception('No tenant appointed.')
		tenant_service = get_tenant_service(principal_service)
		tenant: Optional[Tenant] = tenant_service.find_by_id(trigger_data.tenantId)
		if tenant is None:
			raise Exception(f'Tenant[{trigger_data.tenantId}] not exists.')
		# run by super admin, fake a tenant admin.
		# user id and name still use current principal's
		principal_service = PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=trigger_data.tenantId,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	else:
		if is_not_blank(trigger_data.tenantId) and trigger_data.tenantId != principal_service.get_tenant_id():
			raise Exception(f'Tenant[{trigger_data.tenantId}] does not match principal.')
	
	schema = find_topic_schema(trigger_data.code, principal_service)
	return await PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=trigger_data.triggerType,
		trigger_data=trigger_data.data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=asynchronized,
		handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
	).invoke()


async def try_to_invoke_pipelines(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	return await invoke(trigger_data, trace_id, principal_service, False)


def _resolve_principal(
		trigger_data: PipelineTriggerData, principal_service: PrincipalService
) -> PrincipalService:
	"""Shared tenant/principal resolution used by both sync and async invoke."""
	if trigger_data.data is None:
		raise PipelineKernelException(f'Trigger data is null.')

	if principal_service.is_super_admin():
		if is_blank(trigger_data.tenantId):
			raise Exception('No tenant appointed.')
		tenant_service = get_tenant_service(principal_service)
		tenant: Optional[Tenant] = tenant_service.find_by_id(trigger_data.tenantId)
		if tenant is None:
			raise Exception(f'Tenant[{trigger_data.tenantId}] not exists.')
		# run by super admin, fake a tenant admin.
		# user id and name still use current principal's
		return PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=trigger_data.tenantId,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	else:
		if is_not_blank(trigger_data.tenantId) and trigger_data.tenantId != principal_service.get_tenant_id():
			raise Exception(f'Tenant[{trigger_data.tenantId}] does not match principal.')
		return principal_service


def invoke_sync(
		trigger_data: PipelineTriggerData,
		trace_id: PipelineTriggerTraceId, principal_service: PrincipalService
) -> int:
	"""
	Pure-synchronous invocation: drives the synchronous PipelineTrigger chain
	(no async/await) so it can run safely inside a FastAPI `def` route where
	FastAPI dispatches it to a thread pool without blocking the event loop.
	"""
	principal_service = _resolve_principal(trigger_data, principal_service)
	schema = find_topic_schema(trigger_data.code, principal_service)
	return PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=trigger_data.triggerType,
		trigger_data=trigger_data.data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=False,
		handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
	).invoke_sync()


def try_to_invoke_pipelines_sync(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	return invoke_sync(trigger_data, trace_id, principal_service)


async def try_to_invoke_pipelines_async(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	"""
	NOTE: despite the 'async' suffix, this uses the SYNCHRONOUS PipelineTrigger
	(i.e. synchronous storage on the event loop); only the dispatch is pushed to a
	thread pool (asynchronized=True). For genuine end-to-end async data services
	(asyncpg/aiomysql) use try_to_invoke_pipelines_full_async instead.
	"""
	return await invoke(trigger_data, trace_id, principal_service, True)


async def invoke_async(
		trigger_data: PipelineTriggerData,
		trace_id: PipelineTriggerTraceId, principal_service: PrincipalService,
		asynchronized: bool) -> int:
	"""
	Fully-async invocation path. Resolves tenant/principal (same as invoke) then drives an
	AsyncPipelineTrigger whose save_trigger_data and dispatch chain genuinely await async
	data services. This is the entry point the async storage layer is designed for.
	"""
	from .pipeline_trigger_async import AsyncPipelineTrigger

	if trigger_data.data is None:
		raise PipelineKernelException(f'Trigger data is null.')

	if principal_service.is_super_admin():
		if is_blank(trigger_data.tenantId):
			raise Exception('No tenant appointed.')
		tenant_service = get_tenant_service(principal_service)
		tenant: Optional[Tenant] = tenant_service.find_by_id(trigger_data.tenantId)
		if tenant is None:
			raise Exception(f'Tenant[{trigger_data.tenantId}] not exists.')
		# run by super admin, fake a tenant admin.
		# user id and name still use current principal's
		principal_service = PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=trigger_data.tenantId,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	else:
		if is_not_blank(trigger_data.tenantId) and trigger_data.tenantId != principal_service.get_tenant_id():
			raise Exception(f'Tenant[{trigger_data.tenantId}] does not match principal.')

	schema = find_topic_schema(trigger_data.code, principal_service)
	return await AsyncPipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=trigger_data.triggerType,
		trigger_data=trigger_data.data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=asynchronized,
		handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
	).invoke()


async def try_to_invoke_pipelines_full_async(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	"""
	Fully-async pipeline invocation (uses async data services end to end).
	Contrast with try_to_invoke_pipelines (sync data services on the event loop).
	"""
	return await invoke_async(trigger_data, trace_id, principal_service, False)


async def try_to_invoke_pipelines_full_async_background(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> int:
	"""
	Fully-async pipeline invocation with background dispatch (asynchronized=True).
	"""
	return await invoke_async(trigger_data, trace_id, principal_service, True)

