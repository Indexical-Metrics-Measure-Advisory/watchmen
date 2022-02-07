from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import DashboardService, ReportService
from watchmen_model.admin import UserRole
from watchmen_model.common import DashboardId
from watchmen_model.console import Dashboard
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.auth import get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank, trans, trans_readonly
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds

router = APIRouter()


def get_dashboard_service(principal_service: PrincipalService) -> DashboardService:
	return DashboardService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_report_service(dashboard_service: DashboardService) -> ReportService:
	return ReportService(
		dashboard_service.storage, dashboard_service.snowflake_generator, dashboard_service.principal_service)


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


@router.post('/dashboard', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Dashboard)
async def save_dashboard(
		dashboard: Dashboard, principal_service: PrincipalService = Depends(get_console_principal)
) -> Dashboard:
	dashboard_service = get_dashboard_service(principal_service)

	def action(a_dashboard: Dashboard) -> Dashboard:
		a_dashboard.userId = principal_service.get_user_id()
		a_dashboard.tenantId = principal_service.get_tenant_id()
		a_dashboard.lastVisitTime = get_current_time_in_seconds()
		# noinspection DuplicatedCode
		if dashboard_service.is_storable_id_faked(a_dashboard.dashboardId):
			dashboard_service.redress_storable_id(a_dashboard)
			validate_reports(a_dashboard, dashboard_service, principal_service)
			# noinspection PyTypeChecker
			a_dashboard: Dashboard = dashboard_service.create(a_dashboard)
		else:
			# noinspection PyTypeChecker
			existing_dashboard: Optional[Dashboard] = dashboard_service.find_by_id(a_dashboard.dashboardId)
			if existing_dashboard is not None:
				if existing_dashboard.tenantId != a_dashboard.tenantId:
					raise_403()
				if existing_dashboard.userId != a_dashboard.userId:
					raise_403()

			validate_reports(a_dashboard, dashboard_service, principal_service)
			# noinspection PyTypeChecker
			a_dashboard: Dashboard = dashboard_service.update(a_dashboard)
		return a_dashboard

	return trans(dashboard_service, lambda: action(dashboard))


@router.get('/dashboard/rename', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
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


@router.get('/dashboard/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
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
async def delete_report_by_id_by_super_admin(
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
