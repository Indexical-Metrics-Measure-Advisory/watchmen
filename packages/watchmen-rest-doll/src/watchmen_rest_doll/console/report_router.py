from typing import List, Optional

from fastapi import APIRouter, Body, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import ReportService, SubjectService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable, ReportId, TenantId
from watchmen_model.console import Report, Subject
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.auth import get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import get_current_time_in_seconds, is_blank

router = APIRouter()


def get_report_service(principal_service: PrincipalService) -> ReportService:
	return ReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subject_service(report_service: ReportService) -> SubjectService:
	return SubjectService(report_service.storage, report_service.snowflake_generator, report_service.principal_service)


@router.post('/report', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Report)
async def save_report(
		report: Report, principal_service: PrincipalService = Depends(get_console_principal)
) -> Report:
	report_service = get_report_service(principal_service)

	def action(a_report: Report) -> Report:
		a_report.userId = principal_service.get_user_id()
		a_report.tenantId = principal_service.get_tenant_id()
		a_report.lastVisitTime = get_current_time_in_seconds()
		if report_service.is_storable_id_faked(a_report.reportId):
			subject_id = a_report.subjectId
			if is_blank(subject_id):
				raise_400('Subject id is required.')

			subject_service = get_subject_service(report_service)
			existing_subject: Optional[Subject] = subject_service.find_by_id(subject_id)
			if existing_subject is None:
				raise_400('Incorrect subject id.')
			elif existing_subject.tenantId != a_report.tenantId or existing_subject.userId != a_report.userId:
				raise_403()
			else:
				a_report.connectId = existing_subject.connectId

			report_service.redress_storable_id(a_report)
			# noinspection PyTypeChecker
			a_report: Report = report_service.create(a_report)
		else:
			# noinspection PyTypeChecker
			existing_report: Optional[Report] = report_service.find_by_id(a_report.reportId)
			if existing_report is not None:
				if existing_report.tenantId != a_report.tenantId:
					raise_403()
				if existing_report.userId != a_report.userId:
					raise_403()

			a_report.subjectId = existing_report.subjectId
			a_report.connectId = existing_report.connectId

			# noinspection PyTypeChecker
			a_report: Report = report_service.update(a_report)
		return a_report

	return trans(report_service, lambda: action(report))


class QueryReportDataPage(DataPage):
	data: List[Report]


@router.post('/report/name', tags=[UserRole.ADMIN], response_model=QueryReportDataPage)
async def find_reports_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryReportDataPage:
	report_service = get_report_service(principal_service)

	def action() -> QueryReportDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return report_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return report_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(report_service, action)


@router.get('/report/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def delete_report_by_id(
		report_id: Optional[ReportId], principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(report_id):
		raise_400('Report id is required.')

	report_service = get_report_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_report: Optional[Report] = report_service.find_by_id(report_id)
		if existing_report is None:
			raise_404()
		if existing_report.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_report.userId != principal_service.get_user_id():
			raise_403()
		report_service.delete(report_id)

	trans(report_service, action)


@router.delete('/report', tags=[UserRole.SUPER_ADMIN], response_model=Report)
async def delete_report_by_id_by_super_admin(
		report_id: Optional[ReportId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Report:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(report_id):
		raise_400('Report id is required.')

	report_service = get_report_service(principal_service)

	def action() -> Report:
		# noinspection PyTypeChecker
		report: Report = report_service.delete(report_id)
		if report is None:
			raise_404()
		return report

	return trans(report_service, action)
