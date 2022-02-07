from typing import Dict, List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import SpaceService
from watchmen_meta_service.console import ConnectedSpaceService, ReportService, SubjectService
from watchmen_model.admin import Space, UserRole
from watchmen_model.common import ConnectedSpaceId, SpaceId, SubjectId, TenantId
from watchmen_model.console import ConnectedSpace, Report, Subject
from watchmen_rest.util import raise_400, raise_403
from watchmen_rest_doll.auth import get_console_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, trans, trans_readonly
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds

router = APIRouter()


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_service(connected_space_service: ConnectedSpaceService) -> SpaceService:
	return SpaceService(
		connected_space_service.storage, connected_space_service.snowflake_generator,
		connected_space_service.principal_service)


def get_subject_service(connected_space_service: ConnectedSpaceService) -> SubjectService:
	return SubjectService(
		connected_space_service.storage, connected_space_service.snowflake_generator,
		connected_space_service.principal_service)


def get_report_service(connected_space_service: ConnectedSpaceService) -> ReportService:
	return ReportService(
		connected_space_service.storage, connected_space_service.snowflake_generator,
		connected_space_service.principal_service)


def parse_template_ids(template_ids: Optional[str]) -> List[ConnectedSpaceId]:
	if is_blank(template_ids):
		return []
	return ArrayHelper(template_ids.split(',')).filter(lambda x: not is_blank(x)).to_list()


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


class SubjectWithReports(Subject):
	reports: List[Report] = []


class ConnectedSpaceWithSubjects(ConnectedSpace):
	subjects: List[SubjectWithReports] = []


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
		report.simulating = False
		report.simulateData = None
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
	'/connected-space/connect', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=ConnectedSpaceWithSubjects)
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


def load_subjects(
		connected_space: ConnectedSpace, connected_space_service: ConnectedSpaceService
) -> ConnectedSpaceWithSubjects:
	connect_id = connected_space.connectId
	subject_service = get_subject_service(connected_space_service)
	subjects: List[Subject] = subject_service.find_by_connect_id(connect_id)
	report_service = get_report_service(connected_space_service)
	reports: List[Report] = report_service.find_by_connect_id(connect_id)
	report_map: Dict[SubjectId, List[Report]] = ArrayHelper(reports).group_by(lambda x: x.subjectId)

	def to_subject_with_reports(subject: Subject) -> SubjectWithReports:
		my_reports = report_map.get(subject.subjectId)
		subject_with_reports = SubjectWithReports(**subject.dict())
		if my_reports is not None and len(my_reports) != 0:
			subject_with_reports.reports = my_reports
		else:
			subject_with_reports.reports = []
		return subject_with_reports

	connected_space_with_subjects = ConnectedSpaceWithSubjects(**connected_space.dict())
	connected_space_with_subjects.subjects = ArrayHelper(subjects) \
		.map(lambda x: to_subject_with_reports(x)).to_list()
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
			return ArrayHelper(connected_spaces).map(lambda x: load_subjects(x, connected_space_service)).to_list()

	return trans_readonly(connected_space_service, action)

# @router.get("/console_space/connected/me", tags=["console"], response_model=List[ConsoleSpace])
# async def load_connected_space(current_user: User = Depends(deps.get_current_user)):
#     user_id = current_user.userId
#     console_space_list = load_console_space_list_by_user(user_id, current_user)
#     return await load_complete_console_space(console_space_list, current_user)
# @router.post("/console_space/save", tags=["console"], response_model=ConsoleSpace)
# async def update_console_space(console_space: ConsoleSpace, current_user: User = Depends(deps.get_current_user)):
#     console_space = add_tenant_id_to_model(console_space, current_user)
#     new_subject_ids = []
#     for subject in console_space.subjects:
#         new_subject_ids.append(subject.subjectId)
#     console_space.subjectIds = new_subject_ids
#     console_space.userId = current_user.userId
#     return save_console_space(console_space)
# @router.get("/console_space/rename", tags=["console"])
# async def rename_console_space(connect_id: str, name: str, current_user: User = Depends(deps.get_current_user)):
#     rename_console_space_by_id(connect_id, name)
# @router.get("/console_space/delete", tags=["console"])
# async def delete_console_space(connect_id, current_user: User = Depends(deps.get_current_user)):
#     delete_console_space_and_sub_data(connect_id, current_user)
# @router.get("/console_space/template/list", tags=["console"], response_model=List[ConnectedSpaceTemplate])
# async def load_template_space_list(space_id: str, current_user: User = Depends(deps.get_current_user)):
#     results: List[ConsoleSpace] = load_template_space_list_by_space_id(space_id)
#     template_list = []
#     for console_space in results:
#         user = get_user(console_space.userId)
#         template_list.append(
#             ConnectedSpaceTemplate(connectId=console_space.connectId, name=console_space.name, createBy=user.name))
#     return template_list
# @router.get("/console_space/export", tags=["console"], response_model=List[ConsoleSpace])
# async def load_template_for_export(current_user: User = Depends(deps.get_current_user)):
#     console_space_list = load_console_space_template_list_by_user(current_user.userId, current_user)
#     # template_list = list(filter(lambda x: x.isTemplate, console_space_list))
#     return await load_complete_console_space(console_space_list, current_user)
