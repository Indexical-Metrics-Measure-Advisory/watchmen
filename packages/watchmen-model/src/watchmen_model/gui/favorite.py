from typing import List

from pydantic import BaseModel

from watchmen_model.common import ConnectedSpaceId, DashboardId, LastVisit, TenantId, UserId


class Favorite(LastVisit, BaseModel):
	connectedSpaceIds: List[ConnectedSpaceId] = []
	dashboardIds: List[DashboardId] = []
	tenantId: TenantId = None
	userId: UserId = None
