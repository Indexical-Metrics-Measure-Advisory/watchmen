from logging import getLogger
from typing import Callable, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, DashboardService, ReportService, SubjectService
from watchmen_meta.gui import LastSnapshotService
from watchmen_model.admin import UserRole
from watchmen_model.common import ConnectedSpaceId, DashboardId, SubjectId
from watchmen_model.console import Dashboard, Report
from watchmen_model.gui import LastSnapshot
from watchmen_rest import get_admin_principal, get_console_principal, get_principal_by_jwt, get_super_admin_principal, \
	retrieve_authentication_manager
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank
from .connected_space_router import ConnectedSpaceWithSubjects, SubjectWithReports

router = APIRouter()
logger = getLogger(__name__)


def get_dashboard_service(principal_service: PrincipalService) -> DashboardService:
	return DashboardService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_report_service(dashboard_service: DashboardService) -> ReportService:
	return ReportService(
		dashboard_service.storage, dashboard_service.snowflakeGenerator, dashboard_service.principalService)


def get_subject_service(dashboard_service: DashboardService) -> SubjectService:
	return SubjectService(
		dashboard_service.storage, dashboard_service.snowflakeGenerator, dashboard_service.principalService)


def get_connected_space_service(dashboard_service: DashboardService) -> ConnectedSpaceService:
	return ConnectedSpaceService(
		dashboard_service.storage, dashboard_service.snowflakeGenerator, dashboard_service.principalService)


def get_last_snapshot_service(dashboard_service: DashboardService) -> LastSnapshotService:
	return LastSnapshotService(dashboard_service.storage, dashboard_service.principalService)


@router.get('/dashboard/list', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Dashboard])
async def find_my_dashboards(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Dashboard]:
	dashboard_service = get_dashboard_service(principal_service)

	def action() -> List[Dashboard]:
		# noinspection PyTypeChecker
		return dashboard_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())

	return trans_readonly(dashboard_service, action)


class StandaloneDashboard(BaseModel):
	dashboard: Dashboard = None
	connectedSpaces: List[ConnectedSpaceWithSubjects] = []


def as_empty_dashboard(dashboard: Optional[Dashboard] = None) -> StandaloneDashboard:
	return StandaloneDashboard(dashboard=dashboard, connectedSpaces=[])


# noinspection DuplicatedCode
def load_standalone_dashboard(
		admin_dashboard_id: Optional[DashboardId],
		dashboard_service: DashboardService, principal_service: PrincipalService
) -> StandaloneDashboard:
	if is_blank(admin_dashboard_id):
		return as_empty_dashboard()
	dashboard: Optional[Dashboard] = dashboard_service.find_by_id(admin_dashboard_id)
	if dashboard is None:
		return as_empty_dashboard()
	if dashboard.tenantId != principal_service.get_tenant_id() or dashboard.userId != principal_service.get_user_id():
		raise_403()
	report_ids = ArrayHelper(dashboard.reports).map(lambda x: x.reportId).to_list()
	if len(report_ids) == 0:
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))
	report_service = get_report_service(dashboard_service)
	reports: List[Report] = ArrayHelper(report_ids).map(lambda x: report_service.find_by_id(x)).to_list()
	if len(reports) == 0:
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))
	if ArrayHelper(reports).some(
			lambda x: x.tenantId != principal_service.get_tenant_id() and x.userId != principal_service.get_user_id()):
		# something wrong with data
		logger.error(f'Something wrong with report data for dashboard[{dashboard.dashboardId}]')
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))
	report_map: Dict[SubjectId, List[Report]] = ArrayHelper(reports).group_by(lambda x: x.subjectId)
	subject_ids = ArrayHelper(reports).map(lambda x: x.subjectId).distinct().to_list()
	subject_service = get_subject_service(dashboard_service)
	subjects = ArrayHelper(subject_ids).map(lambda x: subject_service.find_by_id(x)).to_list()
	if len(subjects) == 0:
		logger.error(f'Subject data not found for dashboard[{dashboard.dashboardId}]')
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))
	if ArrayHelper(subjects).some(
			lambda x: x.tenantId != principal_service.get_tenant_id() and x.userId != principal_service.get_user_id()):
		# something wrong with data
		logger.error(f'Something wrong with subject data for dashboard[{dashboard.dashboardId}]')
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))

	def get_my_reports(subject_id: SubjectId) -> List[Report]:
		my_reports = report_map.get(subject_id)
		return [] if my_reports is None else my_reports

	subject_map: Dict[ConnectedSpaceId, List[SubjectWithReports]] = ArrayHelper(subjects) \
		.map(lambda x: SubjectWithReports(**x.dict(), reports=get_my_reports(x.subjectId))) \
		.filter(lambda x: x.reports is not None and len(x.reports) != 0) \
		.group_by(lambda x: x.connectId)
	connect_ids = ArrayHelper(subjects).map(lambda x: x.connectId).distinct().to_list()
	connected_space_service = get_connected_space_service(dashboard_service)
	connected_spaces = ArrayHelper(connect_ids).map(lambda x: connected_space_service.find_by_id(x)).to_list()
	if len(connected_spaces) == 0:
		logger.error(f'Connected space data not found for dashboard[{dashboard.dashboardId}]')
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))
	if ArrayHelper(connected_spaces).some(
			lambda x: x.tenantId != principal_service.get_tenant_id() and x.userId != principal_service.get_user_id()):
		# something wrong with data
		logger.error(f'Something wrong with connected space data for dashboard[{dashboard.dashboardId}]')
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))

	def get_my_subjects(connect_id: ConnectedSpaceId) -> List[SubjectWithReports]:
		my_subjects = subject_map.get(connect_id)
		return [] if my_subjects is None else my_subjects

	connected_spaces_with_subjects = ArrayHelper(connected_spaces) \
		.map(lambda x: ConnectedSpaceWithSubjects(**x.dict(), subjects=get_my_subjects(x.connectId))) \
		.filter(lambda x: x.subjects is not None and len(x.subjects) != 0) \
		.to_list()
	if len(connected_spaces_with_subjects) == 0:
		# something wrong with data
		logger.error(f'Something wrong with connected space data for dashboard[{dashboard.dashboardId}]')
		return as_empty_dashboard(dashboard=Dashboard(**dashboard.dict(), reports=[]))

	# get available reports
	available_report_map = ArrayHelper(reports).to_map(lambda x: x.reportId, lambda x: x)

	return StandaloneDashboard(
		dashboard=Dashboard(
			# **dashboard.dict(),
			dashboardId=dashboard.dashboardId,
			name=dashboard.name,
			paragraphs=dashboard.paragraphs,
			autoRefreshInterval=dashboard.autoRefreshInterval,
			# remove useless report data from dashboard
			reports=ArrayHelper(dashboard.reports).filter(
				lambda x: available_report_map[x.reportId] is not None).to_list()
		),
		connected_spaces=connected_spaces_with_subjects
	)


@router.get('/dashboard/admin', tags=[UserRole.ADMIN], response_model=StandaloneDashboard)
async def load_admin_dashboard(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> StandaloneDashboard:
	"""
	load admin dashboard
	"""
	dashboard_service = get_dashboard_service(principal_service)

	def find_admin_dashboard_id() -> Optional[DashboardId]:
		last_snapshot_service = get_last_snapshot_service(dashboard_service)
		last_snapshot: Optional[LastSnapshot] = last_snapshot_service.find_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if last_snapshot is None:
			return None
		return last_snapshot.adminDashboardId

	def action() -> StandaloneDashboard:
		return load_standalone_dashboard(find_admin_dashboard_id(), dashboard_service, principal_service)

	return trans_readonly(dashboard_service, action)


def validate_reports(
		dashboard: Dashboard, dashboard_service: DashboardService, principal_service: PrincipalService) -> None:
	reports = dashboard.reports
	if reports is None:
		dashboard.reports = []
		return
	if len(reports) == 0:
		return

	report_ids = ArrayHelper(reports).map(lambda x: x.reportId).distinct().to_list()
	if len(report_ids) == 0:
		dashboard.reports = []
		return

	report_service = get_report_service(dashboard_service)

	for report_id in report_ids:
		existing_one = report_service.find_tenant_and_user(report_id)
		if existing_one is None:
			raise_400('Report ids do not match.')
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		if existing_user_id != principal_service.get_user_id():
			raise_403()


def ask_save_dashboard_action(
		dashboard_service: DashboardService, principal_service: PrincipalService) -> Callable[[Dashboard], Dashboard]:
	def action(dashboard: Dashboard) -> Dashboard:
		dashboard.userId = principal_service.get_user_id()
		dashboard.tenantId = principal_service.get_tenant_id()
		dashboard.lastVisitTime = get_current_time_in_seconds()
		# noinspection DuplicatedCode
		if dashboard_service.is_storable_id_faked(dashboard.dashboardId):
			dashboard_service.redress_storable_id(dashboard)
			validate_reports(dashboard, dashboard_service, principal_service)
			# noinspection PyTypeChecker
			dashboard: Dashboard = dashboard_service.create(dashboard)
		else:
			# noinspection PyTypeChecker
			existing_dashboard: Optional[Dashboard] = dashboard_service.find_by_id(dashboard.dashboardId)
			if existing_dashboard is not None:
				if existing_dashboard.tenantId != dashboard.tenantId:
					raise_403()
				if existing_dashboard.userId != dashboard.userId:
					raise_403()

			validate_reports(dashboard, dashboard_service, principal_service)
			# noinspection PyTypeChecker
			dashboard: Dashboard = dashboard_service.update(dashboard)
		return dashboard

	return action


@router.post('/dashboard', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Dashboard)
async def save_dashboard(
		dashboard: Dashboard, principal_service: PrincipalService = Depends(get_console_principal)
) -> Dashboard:
	dashboard_service = get_dashboard_service(principal_service)
	action = ask_save_dashboard_action(dashboard_service, principal_service)
	return trans(dashboard_service, lambda: action(dashboard))


@router.get('/dashboard/shared', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=StandaloneDashboard)
async def load_shared_dashboard(dashboard_id: Optional[DashboardId], token: Optional[str]) -> StandaloneDashboard:
	"""
	load shared dashboard
	"""
	if is_blank(dashboard_id):
		raise_400('Dashboard id is required.')
	if is_blank(token):
		raise_400('Token is required.')

	principal_service: PrincipalService = get_principal_by_jwt(
		retrieve_authentication_manager(), token, [UserRole.CONSOLE, UserRole.ADMIN])
	dashboard_service = get_dashboard_service(principal_service)

	def action() -> StandaloneDashboard:
		return load_standalone_dashboard(dashboard_id, dashboard_service, principal_service)

	return trans_readonly(dashboard_service, action)


@router.get('/dashboard/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def update_dashboard_name_by_id(
		dashboard_id: Optional[DashboardId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	"""
	rename dashboard will not increase the optimistic lock version
	"""
	if is_blank(dashboard_id):
		raise_400('Dashboard id is required.')

	dashboard_service = get_dashboard_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		existing_one = dashboard_service.find_tenant_and_user(dashboard_id)
		if existing_one is None:
			raise_404()
		existing_tenant_id, existing_user_id = existing_one
		if existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		elif existing_user_id != principal_service.get_user_id():
			raise_403()
		# noinspection PyTypeChecker
		dashboard_service.update_name(
			dashboard_id, name, principal_service.get_user_id(), principal_service.get_tenant_id())

	trans(dashboard_service, action)


@router.get('/dashboard/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def delete_dashboard_by_id(
		dashboard_id: Optional[DashboardId], principal_service: PrincipalService = Depends(get_console_principal)
) -> None:
	if is_blank(dashboard_id):
		raise_400('Dashboard id is required.')

	dashboard_service = get_dashboard_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_dashboard: Optional[Dashboard] = dashboard_service.find_by_id(dashboard_id)
		if existing_dashboard is None:
			raise_404()
		if existing_dashboard.tenantId != principal_service.get_tenant_id():
			raise_403()
		if not principal_service.is_tenant_admin() and existing_dashboard.userId != principal_service.get_user_id():
			raise_403()
		dashboard_service.delete(dashboard_id)

	trans(dashboard_service, action)


@router.delete('/dashboard', tags=[UserRole.SUPER_ADMIN], response_model=Dashboard)
async def delete_dashboard_by_id_by_super_admin(
		dashboard_id: Optional[DashboardId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Dashboard:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(dashboard_id):
		raise_400('Report id is required.')

	dashboard_service = get_dashboard_service(principal_service)

	def action() -> Dashboard:
		# noinspection PyTypeChecker
		dashboard: Dashboard = dashboard_service.delete(dashboard_id)
		if dashboard is None:
			raise_404()
		return dashboard

	return trans(dashboard_service, action)
