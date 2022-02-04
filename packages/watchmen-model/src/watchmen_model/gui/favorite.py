from typing import List

from pydantic import BaseModel

from watchmen_model.common import ConnectedSpaceId, DashboardId, LastVisit, UserBasedTuple


class Favorite(UserBasedTuple, LastVisit, BaseModel):
	connectedSpaceIds: List[ConnectedSpaceId] = []
	dashboardIds: List[DashboardId] = []
