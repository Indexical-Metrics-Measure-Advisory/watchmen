from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Space, UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.admin import ask_save_space_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_tenant_based_tuples

router = APIRouter()


def get_space_service(principal_service: PrincipalService) -> SpaceService:
	return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/space/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_spaces(
		spaces: List[Space], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if spaces is None:
		return
	if len(spaces) == 0:
		return

	space_service = get_space_service(principal_service)

	def action() -> None:
		validate_tenant_based_tuples(spaces, get_user_service(space_service), principal_service)
		save = ask_save_space_action(space_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(spaces).each(lambda x: save(x))

	trans(space_service, action)
