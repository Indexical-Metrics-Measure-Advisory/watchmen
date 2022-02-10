from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import DashboardService
from watchmen_model.admin import UserRole
from watchmen_model.console import Dashboard
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.console import ask_save_dashboard_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_user_based_tuples

router = APIRouter()


def get_dashboard_service(principal_service: PrincipalService) -> DashboardService:
	return DashboardService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/dashboard/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_dashboards(
		dashboards: List[Dashboard], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if dashboards is None:
		return
	if len(dashboards) == 0:
		return

	dashboard_service = get_dashboard_service(principal_service)

	def action() -> None:
		validate_user_based_tuples(dashboards, get_user_service(dashboard_service), principal_service)
		save = ask_save_dashboard_action(dashboard_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(dashboards).each(lambda x: save(x))

	trans(dashboard_service, action)
