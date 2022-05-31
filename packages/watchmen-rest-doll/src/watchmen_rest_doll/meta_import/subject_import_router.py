from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import SubjectService
from watchmen_model.admin import UserRole
from watchmen_model.console import Subject
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.console import ask_save_subject_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_user_based_tuples

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/subject/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_subjects(
		subjects: List[Subject], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if subjects is None:
		return
	if len(subjects) == 0:
		return

	subject_service = get_subject_service(principal_service)

	def action() -> None:
		validate_user_based_tuples(subjects, get_user_service(subject_service), principal_service)
		save = ask_save_subject_action(subject_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(subjects).each(lambda x: save(x))

	trans(subject_service, action)
