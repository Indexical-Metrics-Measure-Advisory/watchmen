from fastapi import APIRouter

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import SubjectService
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

# TODO subject routers
