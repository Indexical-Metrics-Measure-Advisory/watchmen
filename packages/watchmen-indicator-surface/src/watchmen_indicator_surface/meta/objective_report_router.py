from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveReportService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import TenantId
from watchmen_model.indicator.objective_report import ObjectiveReport
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_403, validate_tenant_id
from watchmen_utilities import is_blank

router = APIRouter()


def get_objective_report_service(principal_service: PrincipalService) -> ObjectiveReportService:
	return ObjectiveReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/indicator/objective/report', tags=[UserRole.ADMIN], response_model=ObjectiveReport)
async def save_objective_report(
		objective_report: ObjectiveReport,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> ObjectiveReport:
	validate_tenant_id(objective_report, principal_service)
	objective_report_service = get_objective_report_service(principal_service)

	# noinspection DuplicatedCode
	def action(an_objective_report: ObjectiveReport) -> ObjectiveReport:
		if objective_report_service.is_storable_id_faked(an_objective_report.objectiveReportId):
			objective_report_service.redress_storable_id(an_objective_report)
			# noinspection PyTypeChecker
			an_objective: ObjectiveReport = objective_report_service.create(an_objective_report)
		# synchronize objective to user groups
		else:
			# noinspection PyTypeChecker
			existing_objective_report: Optional[ObjectiveReport] = objective_report_service.find_by_id(
				an_objective_report.objectiveId)
			if existing_objective_report is not None:
				if existing_objective_report.tenantId != an_objective_report.tenantId:
					raise_403()

			# noinspection PyTypeChecker
			an_objective: ObjectiveReport = objective_report_service.update(an_objective_report)

		return an_objective

	return trans(objective_report_service, lambda: action(objective_report))


@router.get('/indicator/objective/report/name', tags=[UserRole.ADMIN], response_model=List[ObjectiveReport])
async def find_objectives_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[ObjectiveReport]:
	objective_report_service = get_objective_report_service(principal_service)

	def action() -> List[ObjectiveReport]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return objective_report_service.find_by_name(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return objective_report_service.find_by_name(query_name, tenant_id)

	return trans_readonly(objective_report_service, action)
