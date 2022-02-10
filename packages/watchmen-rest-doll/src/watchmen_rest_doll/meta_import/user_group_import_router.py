from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserGroupService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserGroup, UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.admin import ask_save_user_group_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_tenant_based_tuples

router = APIRouter()


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
	return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/user_group/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_user_groups(
		user_groups: List[UserGroup], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if user_groups is None:
		return
	if len(user_groups) == 0:
		return

	user_group_service = get_user_group_service(principal_service)

	def action() -> None:
		validate_tenant_based_tuples(user_groups, get_user_service(user_group_service), principal_service)
		save = ask_save_user_group_action(user_group_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(user_groups).each(lambda x: save(x))

	trans(user_group_service, action)
