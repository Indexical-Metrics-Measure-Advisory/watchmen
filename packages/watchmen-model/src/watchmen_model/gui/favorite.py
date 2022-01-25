from typing import List

from watchmen_model.common import ConnectedSpaceId, DashboardId, TenantId, Tuple, UserId


class Favorite(Tuple):
	connectedSpaceIds: List[ConnectedSpaceId] = []
	dashboardIds: List[DashboardId] = []
	userId: UserId = None
	tenantId: TenantId = None
