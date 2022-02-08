from datetime import datetime

from watchmen_meta.common import AuditableShaper, LastVisitShaper, TupleNotFoundException, \
	UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import DashboardId, TenantId, UserId
from watchmen_model.console import Dashboard
from watchmen_storage import EntityCriteriaExpression, EntityRow, EntityShaper


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

	def get_storable_id_column_name(self) -> str:
		return 'dashboard_id'

	def get_storable_id(self, storable: Dashboard) -> DashboardId:
		return storable.dashboardId

	def set_storable_id(self, storable: Dashboard, storable_id: DashboardId) -> Dashboard:
		storable.dashboardId = storable_id
		return storable

	# noinspection DuplicatedCode
	def update_name(self, dashboard_id: DashboardId, name: str, user_id: UserId, tenant_id: TenantId) -> datetime:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principal_service.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=dashboard_id),
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			],
			update={
				'name': name,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return last_modified_at
