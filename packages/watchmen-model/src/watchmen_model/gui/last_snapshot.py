from pydantic import BaseModel

from watchmen_model.common import DashboardId, Storable, TenantId, UserId


class LastSnapshot(Storable, BaseModel):
	language: str = None
	lastDashboardId: DashboardId = None
	adminDashboardId: DashboardId = None
	favoritePin: bool = False
	tenantId: TenantId = None
	userId: UserId = None
