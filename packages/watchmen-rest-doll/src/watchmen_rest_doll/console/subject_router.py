from typing import Callable, List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, ReportService, SubjectService
from watchmen_model.admin import UserRole
from watchmen_model.common import SubjectId
from watchmen_model.console import Report, Subject
from watchmen_rest import get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import get_current_time_in_seconds, is_blank

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_connected_space_service(subject_service: SubjectService) -> ConnectedSpaceService:
	return ConnectedSpaceService(
		subject_service.storage, subject_service.snowflakeGenerator, subject_service.principalService)


def get_report_service(subject_service: SubjectService) -> ReportService:
	return ReportService(
		subject_service.storage, subject_service.snowflakeGenerator, subject_service.principalService)


def ask_save_subject_action(
		subject_service: SubjectService, principal_service: PrincipalService) -> Callable[[Subject], Subject]:
	def action(subject: Subject) -> Subject:
		subject.userId = principal_service.get_user_id()
		subject.tenantId = principal_service.get_tenant_id()
		subject.lastVisitTime = get_current_time_in_seconds()
		if subject_service.is_storable_id_faked(subject.subjectId):
			connect_id = subject.connectId
			if is_blank(connect_id):
				raise_400('Connected space id is required.')

			connected_space_service: ConnectedSpaceService = get_connected_space_service(subject_service)
			existing_connected_space: Optional[Subject] = connected_space_service.find_by_id(connect_id)
			if existing_connected_space is None:
				raise_400('Incorrect connected space id.')
			elif existing_connected_space.tenantId != subject.tenantId or existing_connected_space.userId != subject.userId:
				raise_403()

			subject_service.redress_storable_id(subject)
			# noinspection PyTypeChecker
			subject: Subject = subject_service.create(subject)
		else:
			# noinspection PyTypeChecker
			existing_subject: Optional[Subject] = subject_service.find_by_id(subject.subjectId)
			if existing_subject is not None:
				if existing_subject.tenantId != subject.tenantId:
					raise_403()
				if existing_subject.userId != subject.userId:
					raise_403()

			subject.connectId = existing_subject.connectId

			# noinspection PyTypeChecker
			subject: Subject = subject_service.update(subject)
		return subject

	return action


@router.get('/subject/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Subject)
async def load_subject_by_name(
		name: str, principal_service: PrincipalService = Depends(get_console_principal)) -> Subject:
	subject_service = get_subject_service(principal_service)

	# TODO user id add

	def action() -> Subject:
		return subject_service.find_by_name(name)

	return trans_readonly(subject_service, action)


@router.post('/subject', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Subject)
async def save_subject(
		subject: Subject, principal_service: PrincipalService = Depends(get_console_principal)
) -> Subject:
	subject_service = get_subject_service(principal_service)
	action = ask_save_subject_action(subject_service, principal_service)
	return trans(subject_service, lambda: action(subject))


@router.get('/subject/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def update_subject_name_by_id(
		subject_id: Optional[SubjectId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	"""
	rename subject will not increase the optimistic lock version
	"""
	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject_service = get_subject_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		existing_one = subject_service.find_tenant_and_user(subject_id)
		if existing_one is None:
			raise_404()
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		elif existing_user_id != principal_service.get_user_id():
			raise_403()
		# noinspection PyTypeChecker
		subject_service.update_name(
			subject_id, name, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(subject_service, action)


@router.get('/subject/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def delete_subject_by_id(
		subject_id: Optional[SubjectId], principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject_service = get_subject_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_subject: Optional[Subject] = subject_service.find_by_id(subject_id)
		if existing_subject is None:
			raise_404()
		if existing_subject.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_subject.userId != principal_service.get_user_id():
			raise_403()
		subject_service.delete(subject_id)
		report_service: ReportService = get_report_service(subject_service)
		report_service.delete_by_subject_id(subject_id)

	trans(subject_service, action)


class SubjectWithReports(Subject):
	reports: List[Report] = []


@router.delete('/subject', tags=[UserRole.SUPER_ADMIN], response_model=SubjectWithReports)
async def delete_subject_by_id_by_super_admin(
		subject_id: Optional[SubjectId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> SubjectWithReports:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject_service = get_subject_service(principal_service)

	def action() -> SubjectWithReports:
		# noinspection PyTypeChecker
		subject: Subject = subject_service.delete(subject_id)
		if subject is None:
			raise_404()
		report_service: ReportService = get_report_service(subject_service)
		reports: List[Report] = report_service.delete_by_subject_id(subject_id)
		return SubjectWithReports(**subject.dict(), reports=reports)

	return trans(subject_service, action)
