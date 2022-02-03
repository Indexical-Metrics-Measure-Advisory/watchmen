from fastapi import APIRouter

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import PipelineService
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
