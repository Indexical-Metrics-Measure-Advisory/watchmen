from typing import List

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ReportService
from watchmen_model.admin import UserRole
from watchmen_model.console import Report
from watchmen_rest import get_any_admin_principal
from watchmen_rest_doll.console import ask_save_report_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper
from .validator import get_user_service, validate_user_based_tuples

router = APIRouter()


def get_report_service(principal_service: PrincipalService) -> ReportService:
	return ReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/report/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_reports(
		reports: List[Report], principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if reports is None:
		return
	if len(reports) == 0:
		return

	report_service = get_report_service(principal_service)

	def action() -> None:
		validate_user_based_tuples(reports, get_user_service(report_service), principal_service)
		save = ask_save_report_action(report_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(reports).each(lambda x: save(x))

	trans(report_service, action)
