from datetime import datetime
from typing import Optional, Union

from watchmen_meta.common import AuditableShaper, LastVisitShaper, TupleNotFoundException, \
	UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import DashboardId, TenantId, UserId
from watchmen_model.console import Dashboard, DashboardParagraph, DashboardReport
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class DashboardShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_to_dict(
			self,
			data: Optional[Union[dict, DashboardReport, DashboardParagraph]]
	) -> Optional[dict]:
		if data is None:
			return None
		elif isinstance(data, dict):
			return data
		else:
			return data.dict()

	def serialize(self, dashboard: Dashboard) -> EntityRow:
		row = {
			'dashboard_id': dashboard.dashboardId,
			'name': dashboard.name,
			'reports': ArrayHelper(dashboard.reports).map(lambda x: self.serialize_to_dict(x)).to_list(),
			'paragraphs': ArrayHelper(dashboard.paragraphs).map(lambda x: self.serialize_to_dict(x)).to_list(),
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
			reports=row.get('reports'),
			paragraphs=row.get('paragraphs'),
			autoRefreshInterval=row.get('auto_refresh_interval')
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
		last_modified_by = self.principalService.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=dashboard_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
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
