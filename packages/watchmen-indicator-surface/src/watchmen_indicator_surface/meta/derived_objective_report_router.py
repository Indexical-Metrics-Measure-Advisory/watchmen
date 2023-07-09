from typing import List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import DerivedObjectiveReportService, DerivedObjectiveService, \
	ObjectiveReportService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.admin import UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import ObjectiveId
from watchmen_model.common.tuple_ids import DerivedObjectiveReportId
from watchmen_model.indicator import DerivedObjective
from watchmen_model.indicator.derived_objective_report import DerivedObjectiveReport
from watchmen_model.indicator.objective_report import ObjectiveReport
from watchmen_rest import get_console_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import get_current_time_in_seconds, is_blank

router = APIRouter()


def get_derived_objective_report_service(principal_service: PrincipalService) -> DerivedObjectiveReportService:
	return DerivedObjectiveReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_report_service(principal_service: PrincipalService) -> ObjectiveReportService:
	return ObjectiveReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(derived_objective_service: DerivedObjectiveService) -> UserService:
	return UserService(
		derived_objective_service.storage, derived_objective_service.snowflakeGenerator,
		derived_objective_service.principalService)


@router.get(
	'/indicator/derived-objective/report/connect', tags=[UserRole.CONSOLE, UserRole.ADMIN],
	response_model=DerivedObjectiveReport)
async def connect_as_derived_objective_report(
		objective_report_id: Optional[ObjectiveId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> DerivedObjectiveReport:
	if is_blank(objective_report_id):
		raise_400('objective report id is required.')

	derived_objective_report_service = get_derived_objective_report_service(principal_service)

	def action() -> DerivedObjectiveReport:
		objective_report_service = get_objective_report_service(principal_service)
		objective_report: Optional[ObjectiveReport] = objective_report_service.find_by_id(objective_report_id)
		if objective_report is None:
			raise_400('Incorrect objective report id.')
		if objective_report.tenantId != principal_service.get_tenant_id():
			raise_403()

		derived_objective_report = DerivedObjectiveReport(name=name, objectiveReportId=objective_report_id,
		                                                  definition=objective_report)
		derived_objective_report_service.redress_storable_id(derived_objective_report)
		derived_objective_report.userId = principal_service.get_user_id()
		derived_objective_report.tenantId = principal_service.get_tenant_id()
		derived_objective_report.lastVisitTime = get_current_time_in_seconds()
		# noinspection PyTypeChecker
		derived_objective_report: DerivedObjectiveReport = derived_objective_report_service.create(
			derived_objective_report)
		return derived_objective_report

	return trans(derived_objective_report_service, action)


@router.post('/indicator/derived-objective-report', tags=[UserRole.CONSOLE, UserRole.ADMIN],
             response_model=DerivedObjectiveReport)
async def save_derived_objective_report(
		derived_objective_report: DerivedObjectiveReport,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> DerivedObjectiveReport:
	derived_objective_report_service = get_derived_objective_report_service(principal_service)

	# noinspection DuplicatedCode
	def action(a_derived_objective_report: DerivedObjectiveReport) -> DerivedObjectiveReport:
		a_derived_objective_report.userId = principal_service.get_user_id()
		a_derived_objective_report.tenantId = principal_service.get_tenant_id()
		a_derived_objective_report.lastVisitTime = get_current_time_in_seconds()
		if derived_objective_report_service.is_storable_id_faked(a_derived_objective_report.derivedObjectiveId):
			derived_objective_report_service.redress_storable_id(a_derived_objective_report)
			# noinspection PyTypeChecker
			a_derived_objective_report: DerivedObjectiveReport = derived_objective_report_service.create(
				a_derived_objective_report)
		else:
			# noinspection PyTypeChecker
			existing_derived_objective_report: Optional[DerivedObjectiveReport] = \
				derived_objective_report_service.find_by_id(a_derived_objective_report.derivedObjectiveReportId)
			if existing_derived_objective_report is not None:
				if existing_derived_objective_report.tenantId != a_derived_objective_report.tenantId:
					raise_403()
				if existing_derived_objective_report.userId != a_derived_objective_report.userId:
					raise_403()

			# noinspection PyTypeChecker
			a_derived_objective_report: DerivedObjective = derived_objective_report_service.update(
				a_derived_objective_report)

		return a_derived_objective_report

	return trans(derived_objective_report_service, lambda: action(derived_objective_report))


@router.get(
	'/indicator/derived-objective-report/list', tags=[UserRole.CONSOLE, UserRole.ADMIN],
	response_model=List[DerivedObjectiveReport])
async def find_my_derived_objective_reports(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[DerivedObjectiveReport]:
	derived_objective_report_service = get_derived_objective_report_service(principal_service)

	def action() -> List[DerivedObjectiveReport]:
		# noinspection PyTypeChecker
		derived_objectives_reports: List[DerivedObjectiveReport] = derived_objective_report_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		return derived_objectives_reports

	return trans_readonly(derived_objective_report_service, action)


@router.get('/indicator/derived-objective-report/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN],
            response_class=Response)
async def update_derived_objective_report_name_by_id(
		derived_objective_report_id: Optional[DerivedObjectiveReportId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(derived_objective_report_id):
		raise_400('Derived objective report id is required.')

	derived_objective_report_service = get_derived_objective_report_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		existing_one = derived_objective_report_service.find_tenant_and_user(derived_objective_report_id)
		if existing_one is None:
			raise_404()
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		elif existing_user_id != principal_service.get_user_id():
			raise_403()
		# noinspection PyTypeChecker
		derived_objective_report_service.update_name(
			derived_objective_report_id, name, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(derived_objective_report_service, action)


@router.get('/indicator/derived-objective-report/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN],
            response_class=Response)
async def delete_derived_objective_report_by_id(
		derived_objective_report_id: Optional[DerivedObjectiveReportId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(derived_objective_report_id):
		raise_400('Derived objective report id is required.')

	derived_objective_report_service = get_derived_objective_report_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_derived_objective_report: Optional[DerivedObjectiveReport] = \
			derived_objective_report_service.find_by_id(derived_objective_report_id)
		if existing_derived_objective_report is None:
			raise_404()
		if existing_derived_objective_report.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_derived_objective_report.userId != principal_service.get_user_id():
			raise_403()
		derived_objective_report_service.delete(derived_objective_report_id)

	trans(derived_objective_report_service, action)
