from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import ReportService, SubjectService
from watchmen_model.admin import UserRole
from watchmen_model.common import ReportId
from watchmen_model.console import Report, Subject
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank
from watchmen_utilities import get_current_time_in_seconds

router = APIRouter()


def get_report_service(principal_service: PrincipalService) -> ReportService:
	return ReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subject_service(report_service: ReportService) -> SubjectService:
	return SubjectService(report_service.storage, report_service.snowflake_generator, report_service.principal_service)


@router.post('/report', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Report)
async def save_report(
		report: Report, principal_service: PrincipalService = Depends(get_console_principal)
) -> Report:
	report.userId = principal_service.get_user_id()
	report.tenantId = principal_service.get_tenant_id()
	report.lastVisitTime = get_current_time_in_seconds()

	report_service = get_report_service(principal_service)

	report_service.begin_transaction()
	try:
		if report_service.is_storable_id_faked(report.reportId):
			subject_id = report.subjectId
			if is_blank(subject_id):
				raise_400('Subject id is required.')

			subject_service = get_subject_service(report_service)
			existing_subject: Optional[Subject] = subject_service.find_by_id(subject_id)
			if existing_subject is None:
				raise_400('Incorrect subject id.')
			elif existing_subject.tenantId != report.tenantId or existing_subject.userId != report.userId:
				raise_403()
			else:
				report.subjectId = existing_subject.subjectId
				report.connectId = existing_subject.connectId

			report_service.redress_storable_id(report)
			# noinspection PyTypeChecker
			report: Report = report_service.create(report)
		else:
			report_service.begin_transaction()
			# noinspection PyTypeChecker
			existing_report: Optional[Report] = report_service.find_by_id(report.reportId)
			if existing_report is not None:
				if existing_report.tenantId != report.tenantId:
					raise_403()
				if existing_report.userId != report.userId:
					raise_403()

			report.subjectId = existing_report.subjectId
			report.connectId = existing_report.connectId

			# noinspection PyTypeChecker
			report: Report = report_service.update(report)

		report_service.commit_transaction()
	except HTTPException as e:
		report_service.rollback_transaction()
		raise e
	except Exception as e:
		report_service.rollback_transaction()
		raise_500(e)

	return report


@router.get('/report/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def delete_report(
		report_id: Optional[ReportId], principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(report_id):
		raise_400('Report id is required.')

	report_service = get_report_service(principal_service)

	report_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		existing_report: Optional[Report] = report_service.find_by_id(report_id)
		if existing_report is None:
			raise_404()
		if existing_report.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_report.userId != principal_service.get_user_id():
			raise_403()
		report_service.delete(report_id)
	except HTTPException as e:
		report_service.rollback_transaction()
		raise e
	except Exception as e:
		report_service.rollback_transaction()
		raise_500(e)


@router.delete('/report', tags=[UserRole.SUPER_ADMIN], response_model=Report)
async def delete_user_by_id(
		report_id: Optional[ReportId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[Report]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(report_id):
		raise_400('Report id is required.')

	report_service = get_report_service(principal_service)
	report_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		report: Report = report_service.delete(report_id)
		if report is None:
			raise_404()
		report_service.commit_transaction()
		return report
	except HTTPException as e:
		report_service.rollback_transaction()
		raise e
	except Exception as e:
		report_service.rollback_transaction()
		raise_500(e)
