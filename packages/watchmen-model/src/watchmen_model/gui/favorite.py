from typing import List

from pydantic import BaseModel

from watchmen_model.common import ConnectedSpaceId, DashboardId, Storable, TenantId, UserId


class Favorite(Storable, BaseModel):
	connectedSpaceIds: List[ConnectedSpaceId] = []
	dashboardIds: List[DashboardId] = []
	tenantId: TenantId = None
	userId: UserId = None
