from typing import Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService
from watchmen_meta.analysis import PipelineIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline, UserRole
from watchmen_model.common import PipelineId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.util import trans
from watchmen_utilities import is_blank

router = APIRouter()


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_pipeline_index_service(pipeline_service: PipelineService) -> PipelineIndexService:
	return PipelineIndexService(pipeline_service.storage, pipeline_service.snowflakeGenerator)


@router.get('/pipeline/index/build', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def build_pipeline_index(
		pipeline_id: Optional[PipelineId] = None, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> None:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		# tenant id must match current principal's
		if principal_service.is_tenant_admin() and pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()

		pipeline_index_service = get_pipeline_index_service(pipeline_service)
		pipeline_index_service.build_index(pipeline)

	return trans(pipeline_service, action)
