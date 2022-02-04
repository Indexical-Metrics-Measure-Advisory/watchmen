from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import PipelineGraphicService
from watchmen_meta_service.common import TupleService
from watchmen_model.admin import PipelineGraphic, UserRole
from watchmen_model.common import PipelineGraphicId
from watchmen_rest.util import raise_403, raise_500
from watchmen_rest_doll.auth import get_console_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank

router = APIRouter()


def get_pipeline_graphic_service(principal_service: PrincipalService) -> PipelineGraphicService:
	return PipelineGraphicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/pipeline/graphics/me', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[PipelineGraphic])
async def load_my_pipeline_graphics(
		principal_service: PrincipalService = Depends(get_console_principal)) -> List[PipelineGraphic]:
	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)
	pipeline_graphic_service.begin_transaction()
	try:
		return pipeline_graphic_service.find_all_by_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
	finally:
		pipeline_graphic_service.close_transaction()


@router.post('/pipeline/graphics', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=PipelineGraphic)
async def save_pipeline_graphic(
		pipeline_graphic: PipelineGraphic, principal_service: PrincipalService = Depends(get_console_principal)
) -> PipelineGraphic:
	pipeline_graphic.userId = principal_service.get_user_id()
	pipeline_graphic.tenantId = principal_service.get_tenant_id()

	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)

	if TupleService.is_tuple_id_faked(pipeline_graphic.pipeline_graphicId):
		pipeline_graphic_service.begin_transaction()
		try:
			pipeline_graphic_service.redress_tuple_id(pipeline_graphic)
			# noinspection PyTypeChecker
			pipeline_graphic: PipelineGraphic = pipeline_graphic_service.create(pipeline_graphic)
			pipeline_graphic_service.commit_transaction()
		except Exception as e:
			pipeline_graphic_service.rollback_transaction()
			raise_500(e)
	else:
		pipeline_graphic_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_pipeline_graphic: Optional[PipelineGraphic] = \
				pipeline_graphic_service.find_by_id(pipeline_graphic.pipelineGraphId)
			if existing_pipeline_graphic is not None:
				if existing_pipeline_graphic.tenantId != pipeline_graphic.tenantId:
					raise_403()
				if existing_pipeline_graphic.userId != pipeline_graphic.userId:
					raise_403()

			# noinspection PyTypeChecker
			pipeline_graphic: PipelineGraphic = pipeline_graphic_service.update(pipeline_graphic)
			pipeline_graphic_service.commit_transaction()
		except HTTPException as e:
			pipeline_graphic_service.rollback_transaction()
			raise e
		except Exception as e:
			pipeline_graphic_service.rollback_transaction()
			raise_500(e)

	return pipeline_graphic


@router.get("/pipeline/graphics/delete", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def delete_pipeline_graphic_by_id(
		pipeline_graph_id: Optional[PipelineGraphicId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(pipeline_graph_id):
		return

	pipeline_graphic_service = get_pipeline_graphic_service(principal_service)
	pipeline_graphic_service.begin_transaction()
	try:
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
		pipeline_graphic_service.commit_transaction()
	except HTTPException as e:
		pipeline_graphic_service.rollback_transaction()
		raise e
	except Exception as e:
		pipeline_graphic_service.rollback_transaction()
		raise_500(e)
