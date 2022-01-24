from watchmen.model.common import DashboardId, TenantId, Tuple, UserId


class LastSnapshot(Tuple):
	language: str = None
	lastDashboardId: DashboardId = None
	adminDashboardId: DashboardId = None
	favoritePin: bool = False
	userId: UserId = None
	tenantId: TenantId = None
