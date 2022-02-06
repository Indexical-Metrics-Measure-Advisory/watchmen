from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import ConnectedSpaceService, SubjectService
from watchmen_model.admin import UserRole
from watchmen_model.common import SubjectId, TenantId
from watchmen_model.console import Subject
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.auth import get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank, trans
from watchmen_utilities import get_current_time_in_seconds

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_connected_space_service(subject_service: SubjectService) -> ConnectedSpaceService:
	return ConnectedSpaceService(
		subject_service.storage, subject_service.snowflake_generator, subject_service.principal_service)


@router.post('/subject', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Subject)
async def save_subject(
		subject: Subject, principal_service: PrincipalService = Depends(get_console_principal)
) -> Subject:
	subject_service = get_subject_service(principal_service)

	def action(a_subject: Subject) -> Subject:
		a_subject.userId = principal_service.get_user_id()
		a_subject.tenantId = principal_service.get_tenant_id()
		a_subject.lastVisitTime = get_current_time_in_seconds()
		if subject_service.is_storable_id_faked(a_subject.reportId):
			connect_id = a_subject.connectId
			if is_blank(connect_id):
				raise_400('Connected space id is required.')

			connected_space_service: ConnectedSpaceService = get_connected_space_service(subject_service)
			existing_connected_space: Optional[Subject] = connected_space_service.find_by_id(connect_id)
			if existing_connected_space is None:
				raise_400('Incorrect connected space id.')
			elif existing_connected_space.tenantId != a_subject.tenantId or existing_connected_space.userId != a_subject.userId:
				raise_403()

			subject_service.redress_storable_id(a_subject)
			# noinspection PyTypeChecker
			a_subject: Subject = subject_service.create(a_subject)
		else:
			# noinspection PyTypeChecker
			existing_subject: Optional[Subject] = subject_service.find_by_id(a_subject.subjectId)
			if existing_subject is not None:
				if existing_subject.tenantId != a_subject.tenantId:
					raise_403()
				if existing_subject.userId != a_subject.userId:
					raise_403()

			a_subject.connectId = existing_subject.connectId

			# noinspection PyTypeChecker
			a_subject: Subject = subject_service.update(a_subject)
		return a_subject

	return trans(subject_service, lambda: action(subject))


@router.get('/subject/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def update_subject_name_by_id(
		subject_id: Optional[SubjectId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	"""
	rename pipeline will not increase the optimistic lock version
	"""
	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject_service = get_subject_service(principal_service)

	def action() -> None:
		existing_tenant_id: Optional[TenantId] = subject_service.find_tenant_id(subject_id)
		if existing_tenant_id is None:
			raise_404()
		elif existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		# noinspection PyTypeChecker
		subject_service.update_name(
			subject_id, name, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(subject_service, action)


@router.get('/subject/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def delete_subject(
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

	trans(subject_service, action)


@router.delete('/subject', tags=[UserRole.SUPER_ADMIN], response_model=Subject)
async def delete_subject_by_id_by_super_admin(
		subject_id: Optional[SubjectId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Subject:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject_service = get_subject_service(principal_service)

	def action() -> Subject:
		# noinspection PyTypeChecker
		subject: Subject = subject_service.delete(subject_id)
		if subject is None:
			raise_404()
		return subject

	return trans(subject_service, action)
