import yaml
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, UserRole
from watchmen_model.common import PipelineId, TenantId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

from .pipeline_common import (
	ensure_design_environment_for_yaml_update,
	get_pipeline_service,
	is_system_topic_by_id,
	ask_save_pipeline_action,
	filter_pipelines_by_source_topic_system,
)

router = APIRouter()


@router.get('/pipeline/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def load_pipeline_yaml_by_id(
		pipeline_id: Optional[PipelineId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
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
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	yaml_str = yaml.dump(pipeline.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.post('/pipeline/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def save_pipeline_yaml(
		request: Request, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		pipeline_dict = yaml.safe_load(yaml_str)
		pipeline = Pipeline.model_validate(pipeline_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	validate_tenant_id(pipeline, principal_service)
	pipeline_service = get_pipeline_service(principal_service)
	action = ask_save_pipeline_action(pipeline_service, principal_service)
	saved_pipeline = trans(pipeline_service, lambda: action(pipeline))

	saved_yaml_str = yaml.dump(saved_pipeline.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=saved_yaml_str, media_type="application/x-yaml")


@router.get('/pipeline/all/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_pipelines_yaml(principal_service: PrincipalService = Depends(get_admin_principal)) -> Response:
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		pipelines = pipeline_service.find_all(tenant_id)
		return filter_pipelines_by_source_topic_system(pipelines, principal_service)

	pipelines = trans_readonly(pipeline_service, action)
	yaml_str = yaml.dump([p.model_dump(mode='json', by_alias=True, exclude_none=True) for p in pipelines], sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.get('/pipeline/name/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_pipeline_yaml_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	if is_blank(query_name):
		raise_400('Pipeline name is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		tenant_id: TenantId = principal_service.get_tenant_id()
		pipeline: Optional[Pipeline] = pipeline_service.find_by_name_and_tenant(query_name, tenant_id)
		if pipeline is None:
			raise_404()
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	yaml_str = yaml.dump(pipeline.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")
