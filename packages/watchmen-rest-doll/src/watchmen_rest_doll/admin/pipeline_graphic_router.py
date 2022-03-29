from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_meta.admin import PipelineGraphicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, TupleService
from watchmen_model.admin import PipelineGraphic, UserRole
from watchmen_model.common import PipelineGraphicId
from watchmen_rest import get_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank, is_date, is_not_blank

router = APIRouter()


def get_pipeline_graphic_service(principal_service: PrincipalService) -> PipelineGraphicService:
	return PipelineGraphicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/pipeline/graphics', tags=[UserRole.ADMIN], response_model=List[PipelineGraphic])
async def find_my_pipeline_graphics(
		principal_service: PrincipalService = Depends(get_admin_principal)) -> List[PipelineGraphic]:
	"""
	get my all pipeline graphics
	"""
	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)

	def action() -> List[PipelineGraphic]:
		# noinspection PyTypeChecker
		return pipeline_graphic_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())

	return trans_readonly(pipeline_graphic_service, action)


@router.post('/pipeline/graphics', tags=[UserRole.ADMIN], response_model=PipelineGraphic)
async def save_pipeline_graphic(
		pipeline_graphic: PipelineGraphic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> PipelineGraphic:
	"""
	create or update my pipeline graphic
	"""
	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)

	def action(graphic: PipelineGraphic) -> PipelineGraphic:
		graphic.userId = principal_service.get_user_id()
		graphic.tenantId = principal_service.get_tenant_id()

		if TupleService.is_storable_id_faked(graphic.pipelineGraphId):
			pipeline_graphic_service.redress_storable_id(graphic)
			graphic.createdAt = get_current_time_in_seconds()
			graphic.lastModifiedAt = get_current_time_in_seconds()
			# noinspection PyTypeChecker
			graphic: PipelineGraphic = pipeline_graphic_service.create(graphic)
		else:
			# noinspection PyTypeChecker
			existing_pipeline_graphic: Optional[PipelineGraphic] = \
				pipeline_graphic_service.find_by_id(graphic.pipelineGraphId)
			if existing_pipeline_graphic is not None:
				if existing_pipeline_graphic.tenantId != graphic.tenantId:
					raise_403()
				if existing_pipeline_graphic.userId != graphic.userId:
					raise_403()
				graphic.createdAt = existing_pipeline_graphic.createdAt

			graphic.lastModifiedAt = get_current_time_in_seconds()
			# noinspection PyTypeChecker
			graphic: PipelineGraphic = pipeline_graphic_service.update(graphic)

		return graphic

	return trans(pipeline_graphic_service, lambda: action(pipeline_graphic))


@router.get('/pipeline/graphics/delete', tags=[UserRole.ADMIN], response_class=Response)
async def delete_pipeline_graphic_by_id(
		pipeline_graph_id: Optional[PipelineGraphicId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	"""
	delete my pipeline graphic
	"""
	if is_blank(pipeline_graph_id):
		return

	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)

	def action() -> None:
		# noinspection PyTypeChecker
		existing_pipeline_graphic: Optional[PipelineGraphic] = \
			pipeline_graphic_service.find_by_id(pipeline_graph_id)
		if existing_pipeline_graphic is not None:
			if existing_pipeline_graphic.tenantId != principal_service.get_tenant_id():
				raise_403()
			if existing_pipeline_graphic.userId != principal_service.get_user_id():
				raise_403()

		# noinspection PyTypeChecker
		pipeline_graphic_service.delete_by_id(pipeline_graph_id)

	trans(pipeline_graphic_service, action)


class UpdatedGraphicRequest(BaseModel):
	at: str = None
	existingGraphicIds: List[PipelineGraphicId] = None


class UpdatedGraphicResponse(BaseModel):
	updated: List[PipelineGraphic] = None
	removed: List[PipelineGraphicId] = None


@router.post('/pipeline/graphics/updated', tags=[UserRole.ADMIN], response_model=UpdatedGraphicResponse)
async def find_updated_and_removed_pipeline_graphics(
		asked: UpdatedGraphicRequest, principal_service: PrincipalService = Depends(get_admin_principal)
) -> UpdatedGraphicResponse:
	if asked is None:
		return UpdatedGraphicResponse(updated=[], removed=[])

	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)

	def action() -> UpdatedGraphicResponse:
		updated = []
		parsed, last_modified_at = is_date(asked.at, ask_all_date_formats())
		if parsed:
			if not isinstance(last_modified_at, datetime):
				last_modified_at = datetime(
					year=last_modified_at.year, month=last_modified_at.month, day=last_modified_at.day,
					hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
			updated = pipeline_graphic_service.find_modified_after(
				last_modified_at, principal_service.get_user_id(), principal_service.get_user_id())

		removed = []
		asked_graphic_ids = ArrayHelper(asked.existingGraphicIds).filter(lambda x: is_not_blank(x)).to_list()
		if len(asked.existingGraphicIds) == 0:
			existing_graphics = pipeline_graphic_service.find_by_ids(
				asked_graphic_ids, principal_service.get_user_id(), principal_service.get_tenant_id())
			existing_graphic_ids = ArrayHelper(existing_graphics).map(lambda x: x.pipelineGraphId).to_list()
			removed = ArrayHelper(asked_graphic_ids).filter(lambda x: x not in existing_graphic_ids).to_list()

		return UpdatedGraphicResponse(updated=updated, removed=removed)

	return trans_readonly(pipeline_graphic_service, action)


@router.delete('/pipeline/graphics', tags=[UserRole.SUPER_ADMIN], response_model=PipelineGraphic)
async def delete_pipeline_graphic_by_id_by_super_admin(
		pipeline_graphic_id: Optional[PipelineGraphicId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> PipelineGraphic:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(pipeline_graphic_id):
		raise_400('Pipeline graphic id is required.')

	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)

	def action() -> PipelineGraphic:
		# noinspection PyTypeChecker
		pipeline_graphic: PipelineGraphic = pipeline_graphic_service.delete(pipeline_graphic_id)
		if pipeline_graphic is None:
			raise_404()
		return pipeline_graphic

	return trans(pipeline_graphic_service, action)
