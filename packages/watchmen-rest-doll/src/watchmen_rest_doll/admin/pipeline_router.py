from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Body
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_model.admin import Pipeline, UserRole
from watchmen_model.common import PipelineId, TenantId
from watchmen_rest import get_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank, is_date

from .pipeline_common import (
	get_pipeline_service,
	is_system_topic_by_id,
	ask_save_pipeline_action,
	post_update_pipeline_name,
	post_update_pipeline_enablement,
	remove_pipeline_index,
	post_delete_pipeline,
	LastModified,
)

router = APIRouter()


@router.get('/pipeline', tags=[UserRole.ADMIN], response_model=None)
async def load_pipeline_by_id(
		pipeline_id: Optional[PipelineId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Pipeline:
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		# tenant id must match current principal's
		if pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()
		return pipeline

	return trans_readonly(pipeline_service, action)


@router.post('/pipeline', tags=[UserRole.ADMIN], response_model=None)
async def save_pipeline(
		pipeline: Pipeline, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Pipeline:
	validate_tenant_id(pipeline, principal_service)
	if is_system_topic_by_id(pipeline.topicId, principal_service):
		raise_400('Pipelines with system topic as source cannot be saved via YAML.')
	pipeline_service = get_pipeline_service(principal_service)
	action = ask_save_pipeline_action(pipeline_service, principal_service)
	return trans(pipeline_service, lambda: action(pipeline))


@router.get('/pipeline/rename', tags=[UserRole.ADMIN], response_class=Response)
async def update_pipeline_name_by_id(
		pipeline_id: Optional[PipelineId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	"""
	rename pipeline will not increase the optimistic lock version
	"""
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> None:
		existing_tenant_id: Optional[TenantId] = pipeline_service.find_tenant_id(pipeline_id)
		if existing_tenant_id is None:
			raise_404()
		elif existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.update_name(pipeline_id, name, principal_service.get_tenant_id())
		post_update_pipeline_name(pipeline, pipeline_service)

	trans(pipeline_service, action)


@router.get('/pipeline/enabled', tags=[UserRole.ADMIN], response_class=Response)
async def update_pipeline_enabled_by_id(
		pipeline_id: Optional[PipelineId], enabled: Optional[bool],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	"""
	enable/disable pipeline will not increase the optimistic lock version
	"""
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')
	if enabled is None:
		raise_400('Enabled is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> None:
		existing_tenant_id: Optional[TenantId] = pipeline_service.find_tenant_id(pipeline_id)
		if existing_tenant_id is None:
			raise_404()
		elif existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.update_enablement(pipeline_id, enabled, principal_service.get_tenant_id())
		post_update_pipeline_enablement(pipeline, pipeline_service)

	trans(pipeline_service, action)


@router.get('/pipeline/all', tags=[UserRole.ADMIN], response_model=None)
async def find_all_pipelines(principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Pipeline]:
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		return pipeline_service.find_all(tenant_id)

	return trans_readonly(pipeline_service, action)


# noinspection DuplicatedCode
@router.post('/pipeline/updated', tags=[UserRole.ADMIN], response_model=None)
async def find_updated_pipelines(
		lastModified: LastModified, principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Pipeline]:
	if lastModified is None or is_blank(lastModified.at):
		return []
	parsed, last_modified_at = is_date(lastModified.at, ask_all_date_formats())
	if not parsed:
		return []
	if not isinstance(last_modified_at, datetime):
		last_modified_at = datetime(
			year=last_modified_at.year, month=last_modified_at.month, day=last_modified_at.day,
			hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		return pipeline_service.find_modified_after(last_modified_at, principal_service.get_tenant_id())

	return trans_readonly(pipeline_service, action)


@router.delete('/pipeline', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def delete_pipeline_by_id_by_super_admin(
		pipeline_id: Optional[PipelineId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Pipeline:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(pipeline_id):
		raise_400('Topic id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.delete(pipeline_id)
		if pipeline is None:
			raise_404()
		post_delete_pipeline(pipeline.pipelineId, pipeline_service)
		return pipeline

	return trans(pipeline_service, action)
