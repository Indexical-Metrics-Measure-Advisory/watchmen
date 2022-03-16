from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline, PipelineActionType, UserRole, WriteToExternalAction
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.admin import ask_save_pipeline_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_tenant_based_tuples

router = APIRouter()


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/pipeline/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_pipelines(
		pipelines: List[Pipeline], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if pipelines is None:
		return
	if len(pipelines) == 0:
		return

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> None:
		validate_tenant_based_tuples(pipelines, get_user_service(pipeline_service), principal_service)
		for pipeline in pipelines:
			for stage in ArrayHelper(pipeline.stages).to_list():
				for unit in ArrayHelper(stage.units).to_list():
					for an_action in ArrayHelper(unit.action).to_list():
						if an_action.type == PipelineActionType.WRITE_TO_EXTERNAL:
							if isinstance(an_action, WriteToExternalAction):
								an_action.externalWriterId = None
		save = ask_save_pipeline_action(pipeline_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(pipelines).each(lambda x: save(x))

	trans(pipeline_service, action)
