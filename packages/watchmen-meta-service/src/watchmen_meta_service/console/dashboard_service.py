from watchmen_meta_service.common import AuditableShaper, LastVisitShaper, UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import DashboardId
from watchmen_model.console import Dashboard
from watchmen_storage import EntityRow, EntityShaper


class DashboardShaper(EntityShaper):
	def serialize(self, dashboard: Dashboard) -> EntityRow:
		row = {
			'dashboard_id': dashboard.dashboardId,
			'name': dashboard.name,
			'reports': dashboard.reports,
			'paragraphs': dashboard.paragraphs,
			'auto_refresh_interval': dashboard.autoRefreshInterval
		}
		row = AuditableShaper.serialize(dashboard, row)
		row = UserBasedTupleShaper.serialize(dashboard, row)
		row = LastVisitShaper.serialize(dashboard, row)
		return row

	def deserialize(self, row: EntityRow) -> Dashboard:
		dashboard = Dashboard(
			dashboardId=row.get('dashboard_id'),
			name=row.get('name'),
			connectId=row.get('connect_id'),
			autoRefreshInterval=row.get('auto_refresh_interval'),
			dataset=row.get('dataset')
		)
		# noinspection PyTypeChecker
		dashboard: Dashboard = AuditableShaper.deserialize(row, dashboard)
		# noinspection PyTypeChecker
		dashboard: Dashboard = UserBasedTupleShaper.deserialize(row, dashboard)
		# noinspection PyTypeChecker
		dashboard: Dashboard = LastVisitShaper.deserialize(row, dashboard)
		return dashboard


DASHBOARD_ENTITY_NAME = 'dashboards'
DASHBOARD_ENTITY_SHAPER = DashboardShaper()


class DashboardService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return DASHBOARD_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return DASHBOARD_ENTITY_SHAPER

	def get_tuple_id_column_name(self) -> str:
		return 'dashboard_id'

	def get_tuple_id(self, a_tuple: Dashboard) -> DashboardId:
		return a_tuple.dashboardId

	def set_tuple_id(self, a_tuple: Dashboard, tuple_id: DashboardId) -> Dashboard:
		a_tuple.dashboardId = tuple_id
		return a_tuple
