from typing import Dict, List, Optional, Union

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from starlette.responses import Response
from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, ReportService, SubjectService
from watchmen_model.admin import Space, User, UserRole
from watchmen_model.common import ConnectedSpaceId, LastVisit, ReportId, SpaceId, SubjectId, TenantId, UserId
from watchmen_model.console import ConnectedSpace, Report, Subject
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank, is_not_blank

from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly

router = APIRouter()


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_service(connected_space_service: ConnectedSpaceService) -> SpaceService:
	return SpaceService(
		connected_space_service.storage, connected_space_service.snowflakeGenerator,
		connected_space_service.principalService)


def get_subject_service(connected_space_service: ConnectedSpaceService) -> SubjectService:
	return SubjectService(
		connected_space_service.storage, connected_space_service.snowflakeGenerator,
		connected_space_service.principalService)


def get_report_service(connected_space_service: ConnectedSpaceService) -> ReportService:
	return ReportService(
		connected_space_service.storage, connected_space_service.snowflakeGenerator,
		connected_space_service.principalService)


def get_user_service(connected_space_service: ConnectedSpaceService) -> UserService:
	return UserService(
		connected_space_service.storage, connected_space_service.snowflakeGenerator,
		connected_space_service.principalService)


def parse_template_ids(template_ids: Optional[str]) -> List[ConnectedSpaceId]:
	if is_blank(template_ids):
		return []
	return ArrayHelper(template_ids.split(',')).filter(lambda x: is_not_blank(x)).to_list()


def find_template_connected_spaces_by_ids(
		connected_space_service: ConnectedSpaceService,
		template_ids: Optional[str], space_id: SpaceId, tenant_id: TenantId
) -> List[ConnectedSpace]:
	parsed_template_ids = ArrayHelper(parse_template_ids(template_ids)).distinct().to_list()
	if len(parsed_template_ids) == 0:
		return []

	template_connected_spaces = connected_space_service.find_templates_by_ids(parsed_template_ids, space_id, tenant_id)
	if len(template_connected_spaces) != len(parsed_template_ids):
		raise_400(f'Template connected space ids do not match.')

	return template_connected_spaces


def construct_report(report: Optional[Union[dict, Report]]) -> Optional[Report]:
	if report is None:
		return None
	elif isinstance(report, Report):
		return report
	else:
		return Report(**report)


def construct_reports(reports: Optional[list] = None) -> Optional[List[Report]]:
	if reports is None:
		return None
	else:
		return ArrayHelper(reports).map(lambda x: construct_report(x)).to_list()


class SubjectWithReports(Subject):
	reports: List[Report] = []

	def __setattr__(self, name, value):
		if name == 'reports':
			super().__setattr__(name, construct_reports(value))
		else:
			super().__setattr__(name, value)


def construct_subject(subject: Optional[Union[dict, SubjectWithReports]]) -> Optional[SubjectWithReports]:
	if subject is None:
		return None
	elif isinstance(subject, SubjectWithReports):
		return subject
	else:
		return SubjectWithReports(**subject)


def construct_subjects(subjects: Optional[list] = None) -> Optional[List[SubjectWithReports]]:
	if subjects is None:
		return None
	else:
		return ArrayHelper(subjects).map(lambda x: construct_subject(x)).to_list()


class ConnectedSpaceWithSubjects(ConnectedSpace):
	subjects: List[SubjectWithReports] = []

	def __setattr__(self, name, value):
		if name == 'subjects':
			super().__setattr__(name, construct_subjects(value))
		else:
			super().__setattr__(name, value)


def copy_to_connected_space(
		template_connected_space: ConnectedSpace, connected_space: ConnectedSpace,
		connected_space_service: ConnectedSpaceService
) -> List[SubjectWithReports]:
	subject_service = get_subject_service(connected_space_service)
	subjects: List[Subject] = subject_service.find_by_connect_id(template_connected_space.connectId)

	report_service = get_report_service(connected_space_service)
	reports: List[Report] = report_service.find_by_connect_id(template_connected_space.connectId)
	report_map: Dict[SubjectId, List[Report]] = ArrayHelper(reports).group_by(lambda x: x.subjectId)

	now = get_current_time_in_seconds()

	def copy_and_create_report(report: Report, subject_id: SubjectId) -> Report:
		report_service.redress_storable_id(report)
		report.subjectId = subject_id
		report.connectId = connected_space.connectId
		report.userId = connected_space.userId
		report.tenantId = connected_space.tenantId
		report.lastVisitTime = now
		# remove thumbnail
		report.simulateThumbnail = None
		# noinspection PyTypeChecker
		return report_service.create(report)

	def copy_and_create_subject(subject: Subject) -> SubjectWithReports:
		my_reports = report_map.get(subject.subjectId)
		subject_service.redress_storable_id(subject)
		subject.connectId = connected_space.connectId
		subject.userId = connected_space.userId
		subject.tenantId = connected_space.tenantId
		subject.lastVisitTime = now
		# noinspection PyTypeChecker
		subject: Subject = subject_service.create(subject)

		subject_with_reports = SubjectWithReports(**subject.dict())
		if my_reports is not None and len(my_reports) != 0:
			subject_with_reports.reports = ArrayHelper(my_reports) \
				.map(lambda x: copy_and_create_report(x, subject.subjectId)) \
				.to_list()
		else:
			subject_with_reports.reports = []
		return subject_with_reports

	return ArrayHelper(subjects).map(lambda x: copy_and_create_subject(x)).to_list()


@router.get(
	'/connected_space/connect', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=ConnectedSpaceWithSubjects)
async def connect_as_connected_space(
		space_id: Optional[SpaceId], name: Optional[str], template_ids: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> ConnectedSpaceWithSubjects:
	if is_blank(space_id):
		raise_400('Space id is required.')

	connected_space_service = get_connected_space_service(principal_service)

	def action() -> ConnectedSpaceWithSubjects:
		space_service = get_space_service(connected_space_service)
		space: Optional[Space] = space_service.find_by_id(space_id)
		if space is None:
			raise_400('Incorrect space id.')
		if space.tenantId != principal_service.get_tenant_id():
			raise_403()

		template_connected_spaces = find_template_connected_spaces_by_ids(
			connected_space_service, template_ids, space_id, space.tenantId)

		connected_space = ConnectedSpace(spaceId=space_id, name=name, isTemplate=False)
		connected_space_service.redress_storable_id(connected_space)
		connected_space.userId = principal_service.get_user_id()
		connected_space.tenantId = principal_service.get_tenant_id()
		connected_space.lastVisitTime = get_current_time_in_seconds()
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = connected_space_service.create(connected_space)

		subjects_with_reports = ArrayHelper(template_connected_spaces) \
			.map(lambda x: copy_to_connected_space(x, connected_space, connected_space_service)) \
			.flatten().to_list()

		connected_space_with_subjects = ConnectedSpaceWithSubjects(**connected_space.dict())
		connected_space_with_subjects.subjects = subjects_with_reports
		return connected_space_with_subjects

	return trans(connected_space_service, action)


def update_last_visit_time(
		service: Union[ConnectedSpaceService, SubjectService, ReportService],
		storable_id: Union[ConnectedSpaceId, SubjectId, ReportId],
		last_visit: LastVisit
) -> None:
	last_visit.lastVisitTime = service.update_last_visit_time(storable_id)


def to_subject_with_reports(subject: Subject, reports: Optional[List[Report]]) -> SubjectWithReports:
	subject_with_reports = SubjectWithReports(**subject.dict())
	if reports is not None and len(reports) != 0:
		subject_with_reports.reports = reports
	else:
		subject_with_reports.reports = []
	return subject_with_reports


def load_subjects_and_reports(
		connected_space: ConnectedSpace, connected_space_service: ConnectedSpaceService,
		should_update_last_visit_time: bool
) -> ConnectedSpaceWithSubjects:
	connect_id = connected_space.connectId
	subject_service = get_subject_service(connected_space_service)
	subjects: List[Subject] = subject_service.find_by_connect_id(connect_id)
	report_service = get_report_service(connected_space_service)
	reports: List[Report] = report_service.find_by_connect_id(connect_id)
	# noinspection DuplicatedCode
	report_map: Dict[SubjectId, List[Report]] = ArrayHelper(reports).group_by(lambda x: x.subjectId)

	connected_space_with_subjects = ConnectedSpaceWithSubjects(**connected_space.dict())
	connected_space_with_subjects.subjects = ArrayHelper(subjects) \
		.map(lambda x: to_subject_with_reports(x, report_map.get(x.subjectId))).to_list()

	if should_update_last_visit_time:
		# update last visit time
		update_last_visit_time(connected_space_service, connected_space.connectId, connected_space)
		ArrayHelper(subjects) \
			.each(lambda x: update_last_visit_time(subject_service, x.subjectId, x))
		ArrayHelper(reports) \
			.each(lambda x: update_last_visit_time(report_service, x.reportId, x))
	return connected_space_with_subjects


@router.get(
	'/connected_space/list', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[ConnectedSpaceWithSubjects])
async def find_my_connected_spaces(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[ConnectedSpaceWithSubjects]:
	"""
	get my all connected spaces
	"""
	connected_space_service = get_connected_space_service(principal_service)

	def action() -> List[ConnectedSpaceWithSubjects]:
		# noinspection PyTypeChecker
		connected_spaces: List[ConnectedSpace] = connected_space_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if len(connected_spaces) == 0:
			return []
		else:
			return ArrayHelper(connected_spaces).map(
				lambda x: load_subjects_and_reports(x, connected_space_service, True)).to_list()

	return trans(connected_space_service, action)


@router.get('/connected_space/template', tags=[UserRole.ADMIN], response_model=Subject)
async def updated_connected_space_as_template(
		connect_id: Optional[ConnectedSpaceId], is_template: Optional[bool],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	"""
	set as template connected space will not increase the optimistic lock version
	"""
	if is_blank(connect_id):
		raise_400('Connected space id is required.')
	if is_template is None:
		raise_400('Connected space as template or not is required.')

	connected_space_service = get_connected_space_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		existing_one = connected_space_service.find_tenant_and_user(connect_id)
		if existing_one is None:
			raise_404()
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		elif existing_user_id != principal_service.get_user_id():
			raise_403()
		# noinspection PyTypeChecker
		connected_space_service.update_as_template(
			connect_id, is_template, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(connected_space_service, action)


@router.get('/connected_space/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def update_connected_space_name_by_id(
		connect_id: Optional[ConnectedSpaceId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	"""
	rename connected space will not increase the optimistic lock version
	"""
	if is_blank(connect_id):
		raise_400('Connected space id is required.')

	connected_space_service = get_connected_space_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		existing_one = connected_space_service.find_tenant_and_user(connect_id)
		if existing_one is None:
			raise_404()
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		elif existing_user_id != principal_service.get_user_id():
			raise_403()
		# noinspection PyTypeChecker
		connected_space_service.update_name(
			connect_id, name, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(connected_space_service, action)


@router.get('/connected_space/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def delete_connected_space_by_id(
		connect_id: Optional[ConnectedSpaceId], principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(connect_id):
		raise_400('Connected space id is required.')

	connected_space_service = get_connected_space_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_connected_space: Optional[ConnectedSpace] = connected_space_service.find_by_id(connect_id)
		if existing_connected_space is None:
			raise_404()
		if existing_connected_space.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_connected_space.userId != principal_service.get_user_id():
			raise_403()
		connected_space_service.delete(connect_id)
		subject_service: SubjectService = get_subject_service(connected_space_service)
		subject_service.delete_by_connect_id(connect_id)
		report_service: ReportService = get_report_service(connected_space_service)
		report_service.delete_by_connect_id(connect_id)

	trans(connected_space_service, action)


class TemplateConnectedSpace(BaseModel):
	connectId: ConnectedSpaceId = None
	name: str = None
	createdBy: str = None


@router.get(
	'/connected_space/template/list', tags=[UserRole.CONSOLE, UserRole.ADMIN],
	response_model=List[TemplateConnectedSpace])
async def find_all_template_connected_spaces(
		space_id: Optional[SpaceId], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[TemplateConnectedSpace]:
	if is_blank(space_id):
		raise_400('Space id is required.')

	connected_space_service = get_connected_space_service(principal_service)

	def to_template_connected_space(
			connected_space: ConnectedSpace, user_map: Dict[UserId, User]) -> TemplateConnectedSpace:
		user: Optional[User] = user_map.get(connected_space.userId)
		created_by = None
		if user is not None:
			if is_blank(user.nickName):
				created_by = user.name
			else:
				created_by = user.nickName
		return TemplateConnectedSpace(
			connectId=connected_space.connectId,
			name=connected_space.name,
			createdBy=created_by
		)

	def action() -> List[TemplateConnectedSpace]:
		connected_spaces = connected_space_service.find_templates_by_space_id(
			space_id, principal_service.get_tenant_id())
		user_ids: List[UserId] = ArrayHelper(connected_spaces).map(lambda x: x.userId).distinct().to_list()
		user_service = get_user_service(connected_space_service)
		users: List[User] = user_service.find_by_ids(user_ids, principal_service.get_tenant_id())
		user_map: Dict[UserId, User] = ArrayHelper(users).to_map(lambda x: x.userId, lambda x: x)
		return ArrayHelper(connected_spaces).map(lambda x: to_template_connected_space(x, user_map)).to_list()

	return trans_readonly(connected_space_service, action)


@router.get('/connected_space/export', tags=[UserRole.ADMIN], response_model=List[ConnectedSpaceWithSubjects])
async def find_template_connected_spaces_for_export(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[ConnectedSpaceWithSubjects]:
	connected_space_service = get_connected_space_service(principal_service)

	def action() -> List[ConnectedSpaceWithSubjects]:
		# noinspection PyTypeChecker
		connected_spaces: List[ConnectedSpace] = \
			connected_space_service.find_templates_by_tenant_id(principal_service.get_tenant_id())
		if len(connected_spaces) == 0:
			return []
		else:
			return ArrayHelper(connected_spaces) \
				.map(lambda x: load_subjects_and_reports(x, connected_space_service, False)) \
				.to_list()

	return trans_readonly(connected_space_service, action)


@router.delete('/connected_space', tags=[UserRole.SUPER_ADMIN], response_model=ConnectedSpaceWithSubjects)
async def delete_connected_space_by_id_by_super_admin(
		connect_id: Optional[ConnectedSpaceId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> ConnectedSpaceWithSubjects:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(connect_id):
		raise_400('Connected space id is required.')

	connected_space_service = get_connected_space_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> ConnectedSpaceWithSubjects:
		# noinspection PyTypeChecker
		existing_connected_space: Optional[ConnectedSpace] = connected_space_service.find_by_id(connect_id)
		if existing_connected_space is None:
			raise_404()
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = connected_space_service.delete(connect_id)
		subject_service: SubjectService = get_subject_service(connected_space_service)
		subjects: List[Subject] = subject_service.delete_by_connect_id(connect_id)
		report_service: ReportService = get_report_service(connected_space_service)
		reports: List[Report] = report_service.delete_by_connect_id(connect_id)
		report_map: Dict[SubjectId, List[Report]] = ArrayHelper(reports).group_by(lambda x: x.subjectId)

		connected_space_with_subjects = ConnectedSpaceWithSubjects(**connected_space.dict())
		connected_space_with_subjects.subjects = ArrayHelper(subjects) \
			.map(lambda x: to_subject_with_reports(x, report_map.get(x.subjectId))).to_list()
		return connected_space_with_subjects

	return trans(connected_space_service, action)
