from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import PipelineService
from watchmen_meta_service.analysis import PipelineIndexService
from watchmen_model.admin import Pipeline, UserRole
from watchmen_model.common import PipelineId, UserId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_engine_cache_enabled, ask_engine_index_enabled, ask_meta_storage, \
	ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank, validate_tenant_id

router = APIRouter()


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_pipeline_index_service(pipeline_service: PipelineService) -> PipelineIndexService:
	return PipelineIndexService(pipeline_service.storage, pipeline_service.snowflake_generator)


@router.get('/pipeline', tags=[UserRole.ADMIN], response_model=Pipeline)
async def load_pipeline_by_id(
		pipeline_id: Optional[PipelineId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Optional[Pipeline]:
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)
	pipeline_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		# tenant id must match current principal's
		if pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()
		return pipeline
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		pipeline_service.close_transaction()


def build_pipeline_index(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	if not ask_engine_index_enabled():
		return
	get_pipeline_index_service(pipeline_service).build_index(pipeline)


def build_pipeline_cache(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	if not ask_engine_cache_enabled():
		return
	# TODO build pipeline cache
	pass


def post_save_pipeline(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	build_pipeline_index(pipeline, pipeline_service)
	build_pipeline_cache(pipeline, pipeline_service)


@router.post('/pipeline', tags=[UserRole.ADMIN], response_model=Pipeline)
async def save_pipeline(
		pipeline: Pipeline, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Pipeline:
	validate_tenant_id(pipeline, principal_service)

	pipeline_service = get_pipeline_service(principal_service)

	if pipeline_service.is_tuple_id_faked(pipeline.pipelineId):
		pipeline_service.begin_transaction()
		try:
			pipeline_service.redress_tuple_id(pipeline)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.create(pipeline)
			post_save_pipeline(pipeline, pipeline_service)
			pipeline_service.commit_transaction()
		except Exception as e:
			pipeline_service.rollback_transaction()
			raise_500(e)
	else:
		pipeline_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline.pipelineId)
			if existing_pipeline is not None:
				if existing_pipeline.tenantId != pipeline.tenantId:
					raise_403()

			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.update(pipeline)
			post_save_pipeline(pipeline, pipeline_service)
			pipeline_service.commit_transaction()
		except HTTPException as e:
			pipeline_service.rollback_transaction()
			raise e
		except Exception as e:
			pipeline_service.rollback_transaction()
			raise_500(e)

	return pipeline


def update_pipeline_index_on_name_changed(
		pipeline_id: PipelineId, name: str,
		last_modified_by: UserId, last_modified_at: datetime,
		pipeline_service: PipelineService) -> None:
	if not ask_engine_index_enabled():
		return
	get_pipeline_index_service(pipeline_service).update_index_on_name_changed(
		pipeline_id, name, last_modified_by, last_modified_at)


def update_pipeline_cache_on_name_changed(
		pipeline_id: PipelineId, name: str,
		last_modified_by: UserId, last_modified_at: datetime,
		pipeline_service: PipelineService) -> None:
	if not ask_engine_cache_enabled():
		return
	# TODO update pipeline cache on name changed
	pass


def post_update_pipeline_name(
		pipeline_id: PipelineId, name: str,
		last_modified_by: UserId, last_modified_at: datetime,
		pipeline_service: PipelineService
) -> None:
	update_pipeline_index_on_name_changed(pipeline_id, name, last_modified_by, last_modified_at, pipeline_service)
	update_pipeline_cache_on_name_changed(pipeline_id, name, last_modified_by, last_modified_at, pipeline_service)


@router.get('/pipeline/rename', tags=[UserRole.ADMIN], response_model=None)
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
	pipeline_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		last_modified_by, last_modified_at = pipeline_service.update_name(
			pipeline_id, name, principal_service.get_tenant_id())
		post_update_pipeline_name(pipeline_id, name, last_modified_by, last_modified_at, pipeline_service)
		pipeline_service.commit_transaction()
	except HTTPException as e:
		pipeline_service.rollback_transaction()
		raise e
	except Exception as e:
		pipeline_service.rollback_transaction()
		raise_500(e)


def update_pipeline_index_on_enablement_changed(
		pipeline_id: PipelineId, enabled: bool,
		last_modified_by: UserId, last_modified_at: datetime,
		pipeline_service: PipelineService) -> None:
	if not ask_engine_index_enabled():
		return
	get_pipeline_index_service(pipeline_service).update_index_on_enablement_changed(
		pipeline_id, enabled, last_modified_by, last_modified_at)


def update_pipeline_cache_on_enablement_changed(
		pipeline_id: PipelineId, enabled: bool,
		last_modified_by: UserId, last_modified_at: datetime,
		pipeline_service: PipelineService) -> None:
	if not ask_engine_cache_enabled():
		return
	# TODO update pipeline cache on enablement changed
	pass


def post_update_pipeline_enablement(
		pipeline_id: PipelineId, enabled: bool,
		last_modified_by: UserId, last_modified_at: datetime,
		pipeline_service: PipelineService
) -> None:
	update_pipeline_index_on_enablement_changed(
		pipeline_id, enabled, last_modified_by, last_modified_at, pipeline_service)
	update_pipeline_cache_on_enablement_changed(
		pipeline_id, enabled, last_modified_by, last_modified_at, pipeline_service)


@router.get('/pipeline/enabled', tags=[UserRole.ADMIN], response_model=None)
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
	pipeline_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		last_modified_by, last_modified_at = pipeline_service.update_enablement(
			pipeline_id, enabled, principal_service.get_tenant_id())
		post_update_pipeline_enablement(pipeline_id, enabled, last_modified_by, last_modified_at, pipeline_service)
		pipeline_service.commit_transaction()
	except HTTPException as e:
		pipeline_service.rollback_transaction()
		raise e
	except Exception as e:
		pipeline_service.rollback_transaction()
		raise_500(e)


@router.get('/pipeline/all', tags=[UserRole.ADMIN], response_model=List[Pipeline])
async def find_all_pipelines(principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Pipeline]:
	tenant_id = principal_service.get_tenant_id()

	pipeline_service = get_pipeline_service(principal_service)
	pipeline_service.begin_transaction()
	try:
		return pipeline_service.find_all(tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		pipeline_service.close_transaction()


def remove_pipeline_index(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	if not ask_engine_index_enabled():
		return
	get_pipeline_index_service(pipeline_service).remove_index(pipeline_id)


def remove_pipeline_cache(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	if not ask_engine_cache_enabled():
		return
	# TODO remove pipeline from cache
	pass


def post_delete_pipeline(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	remove_pipeline_index(pipeline_id, pipeline_service)
	remove_pipeline_cache(pipeline_id, pipeline_service)


@router.delete('/pipeline', tags=[UserRole.SUPER_ADMIN], response_model=Pipeline)
async def delete_topic_by_id(
		pipeline_id: Optional[PipelineId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[Pipeline]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(pipeline_id):
		raise_400('Topic id is required.')

	pipeline_service = get_pipeline_service(principal_service)
	pipeline_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.delete(pipeline_id)
		if pipeline is None:
			raise_404()
		post_delete_pipeline(pipeline.topicId, pipeline_service)
		pipeline_service.commit_transaction()
		return pipeline
	except HTTPException as e:
		pipeline_service.rollback_transaction()
		raise e
	except Exception as e:
		pipeline_service.rollback_transaction()
		raise_500(e)
