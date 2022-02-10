from typing import Callable, List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService
from watchmen_meta.analysis import PipelineIndexService
from watchmen_meta.common import TupleService
from watchmen_model.admin import Pipeline, PipelineAction, PipelineStage, PipelineUnit, UserRole
from watchmen_model.common import PipelineId, TenantId
from watchmen_reactor.cache import CacheService
from watchmen_rest import get_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_engine_index_enabled, ask_meta_storage, \
	ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, validate_tenant_id
from watchmen_utilities import ArrayHelper, is_blank

router = APIRouter()


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_pipeline_index_service(pipeline_service: PipelineService) -> PipelineIndexService:
	return PipelineIndexService(pipeline_service.storage, pipeline_service.snowflake_generator)


@router.get('/pipeline', tags=[UserRole.ADMIN], response_model=Pipeline)
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


def redress_action_ids(action: PipelineAction, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(action.actionId):
		action.actionId = pipeline_service.generate_storable_id()


def redress_unit_ids(unit: PipelineUnit, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(unit.unitId):
		unit.unitId = pipeline_service.generate_storable_id()
	ArrayHelper(unit.do).each(lambda x: redress_action_ids(x, pipeline_service))


def redress_stage_ids(stage: PipelineStage, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(stage.stageId):
		stage.stageId = pipeline_service.generate_storable_id()
	ArrayHelper(stage.units).each(lambda x: redress_unit_ids(x, pipeline_service))


def redress_ids(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	ArrayHelper(pipeline.stages).each(lambda x: redress_stage_ids(x, pipeline_service))


def build_pipeline_index(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	if not ask_engine_index_enabled():
		return
	get_pipeline_index_service(pipeline_service).build_index(pipeline)


def build_pipeline_cache(pipeline: Pipeline) -> None:
	CacheService.pipeline().put(pipeline)


def post_save_pipeline(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	build_pipeline_index(pipeline, pipeline_service)
	build_pipeline_cache(pipeline)


# noinspection PyUnusedLocal
def ask_save_pipeline_action(
		pipeline_service: PipelineService, principal_service: PrincipalService) -> Callable[[Pipeline], Pipeline]:
	def action(pipeline: Pipeline) -> Pipeline:
		if pipeline_service.is_storable_id_faked(pipeline.pipelineId):
			pipeline_service.redress_storable_id(pipeline)
			redress_ids(pipeline, pipeline_service)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.create(pipeline)
		else:
			# noinspection PyTypeChecker
			existing_pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline.pipelineId)
			if existing_pipeline is not None:
				if existing_pipeline.tenantId != pipeline.tenantId:
					raise_403()

			redress_ids(pipeline, pipeline_service)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.update(pipeline)

		post_save_pipeline(pipeline, pipeline_service)

		return pipeline

	return action


@router.post('/pipeline', tags=[UserRole.ADMIN], response_model=Pipeline)
async def save_pipeline(
		pipeline: Pipeline, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Pipeline:
	validate_tenant_id(pipeline, principal_service)
	pipeline_service = get_pipeline_service(principal_service)
	action = ask_save_pipeline_action(pipeline_service, principal_service)
	return trans(pipeline_service, lambda: action(pipeline))


def post_update_pipeline_name(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).update_index_on_name_changed(pipeline)
	CacheService.pipeline().put(pipeline)


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


def post_update_pipeline_enablement(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).update_index_on_enablement_changed(pipeline)
	CacheService.pipeline().put(pipeline)


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


@router.get('/pipeline/all', tags=[UserRole.ADMIN], response_model=List[Pipeline])
async def find_all_pipelines(principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Pipeline]:
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		return pipeline_service.find_all(tenant_id)

	return trans_readonly(pipeline_service, action)


def remove_pipeline_index(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	if not ask_engine_index_enabled():
		return
	get_pipeline_index_service(pipeline_service).remove_index(pipeline_id)


def post_delete_pipeline(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	remove_pipeline_index(pipeline_id, pipeline_service)
	CacheService.pipeline().remove(pipeline_id)


@router.delete('/pipeline', tags=[UserRole.SUPER_ADMIN], response_model=Pipeline)
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
		post_delete_pipeline(pipeline.topicId, pipeline_service)
		return pipeline

	return trans(pipeline_service, action)
