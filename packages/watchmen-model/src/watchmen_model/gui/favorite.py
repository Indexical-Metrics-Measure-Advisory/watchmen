from typing import List

from watchmen_model.common import ConnectedSpaceId, DashboardId, UserBasedTuple


class Favorite(UserBasedTuple):
	connectedSpaceIds: List[ConnectedSpaceId] = []
	dashboardIds: List[DashboardId] = []
