import yaml
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, UserRole
from watchmen_model.common import PipelineId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

from .pipeline_common import (
	ensure_design_environment_for_yaml_update,
	get_pipeline_service,
	get_topic_service,
	is_system_topic_by_id,
	ask_save_pipeline_action,
	filter_pipelines_by_source_topic_system,
)
from .pipeline_agent_common import (
	build_pipeline_topic_resolver,
	to_agent_pipeline_view,
	dump_agent_pipeline_view_yaml,
	build_pipeline_from_agent,
	AgentPipelineYaml,
	AgentPipelineUpsertResult,
)

router = APIRouter()


@router.get('/pipeline/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def load_pipeline_yaml_agent_view_by_id(
		pipeline_id: Optional[PipelineId] = None,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""Download simplified YAML by pipeline_id (no pipelineId / topicId / factorId / stageId / unitId / actionId / tenantId / version)"""
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		if pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	resolver = build_pipeline_topic_resolver(principal_service)
	view = to_agent_pipeline_view(pipeline, resolver)
	return Response(content=dump_agent_pipeline_view_yaml(view), media_type="application/x-yaml")


@router.get('/pipeline/name/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def find_pipeline_yaml_agent_view_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""Download simplified YAML by name (no pipelineId / topicId / factorId / stageId / unitId / actionId / tenantId / version)"""
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
	resolver = build_pipeline_topic_resolver(principal_service)
	view = to_agent_pipeline_view(pipeline, resolver)
	return Response(content=dump_agent_pipeline_view_yaml(view), media_type="application/x-yaml")


@router.get('/pipeline/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_pipelines_yaml_agent_view(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""Download all Pipelines as a simplified YAML array"""
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		pipelines = pipeline_service.find_all(tenant_id)
		return filter_pipelines_by_source_topic_system(pipelines, principal_service)

	pipelines = trans_readonly(pipeline_service, action)
	resolver = build_pipeline_topic_resolver(principal_service)
	views = [to_agent_pipeline_view(p, resolver) for p in pipelines]
	yaml_str = yaml.dump(
		[v.model_dump(mode='json', by_alias=True, exclude_none=True) for v in views],
		sort_keys=False
	)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.post('/pipeline/yaml/agent-upsert', tags=[UserRole.ADMIN], response_class=Response)
async def upsert_pipeline_yaml_for_agent(
		request: Request, dry_run: bool = False,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""
	AI Agent 专用的 Pipeline YAML upsert 端点。
	按 pipeline.name 做 upsert，stage/unit/action id 不复用，服务端统一 redress 生成。
	入参只需业务字段（name / sourceTopicName / stages 等），无需任何内部 id。
	"""
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		agent_dict = yaml.safe_load(yaml_str)
		agent_input = AgentPipelineYaml(**agent_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	if is_blank(agent_input.sourceTopicName):
		raise_400('sourceTopicName is required.')
	if is_blank(agent_input.name):
		raise_400('Pipeline name is required.')

	pipeline_service = get_pipeline_service(principal_service)
	topic_service = get_topic_service(principal_service)

	if dry_run:
		def do_prepare():
			topic_service.storage = pipeline_service.storage
			return build_pipeline_from_agent(agent_input, principal_service, pipeline_service, topic_service)

		action_type, pipeline, resolver, topic_id_mapping, factor_id_mapping = trans_readonly(
			pipeline_service, do_prepare)
		display_action = 'would_create' if action_type == 'create' else 'would_update'
		view = to_agent_pipeline_view(pipeline, resolver)
		result = AgentPipelineUpsertResult(
			action=display_action, dryRun=True,
			pipeline=view.model_dump(mode='json', by_alias=True, exclude_none=True),
			topicIdMapping=topic_id_mapping,
			factorIdMapping=factor_id_mapping
		)
	else:
		def do_save():
			topic_service.storage = pipeline_service.storage
			action_type, pipeline, resolver, topic_id_mapping, factor_id_mapping = build_pipeline_from_agent(
				agent_input, principal_service, pipeline_service, topic_service)
			save_action = ask_save_pipeline_action(pipeline_service, principal_service)
			saved_pipeline = save_action(pipeline)
			return action_type, saved_pipeline, resolver, topic_id_mapping, factor_id_mapping

		action_type, saved_pipeline, resolver, topic_id_mapping, factor_id_mapping = trans(pipeline_service, do_save)
		result = AgentPipelineUpsertResult(
			action=action_type, dryRun=False,
			pipeline=saved_pipeline.model_dump(mode='json', by_alias=True, exclude_none=True),
			topicIdMapping=topic_id_mapping,
			factorIdMapping=factor_id_mapping
		)

	result_yaml = yaml.dump(result.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=result_yaml, media_type="application/x-yaml")
