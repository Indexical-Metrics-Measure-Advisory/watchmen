from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User, UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.admin import ask_save_user_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import validate_tenant_based_tuples

router = APIRouter()


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/user/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_users(
		users: List[User], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if users is None:
		return
	if len(users) == 0:
		return

	user_service = get_user_service(principal_service)

	def action() -> None:
		validate_tenant_based_tuples(users, user_service, principal_service)
		save = ask_save_user_action(user_service, principal_service, False)
		# noinspection PyTypeChecker
		ArrayHelper(users).each(lambda x: save(x))

	trans(user_service, action)
