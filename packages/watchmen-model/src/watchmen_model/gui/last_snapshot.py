from pydantic import BaseModel

from watchmen_model.common import DashboardId, LastVisit, UserBasedTuple


class LastSnapshot(UserBasedTuple, LastVisit, BaseModel):
	language: str = None
	lastDashboardId: DashboardId = None
	adminDashboardId: DashboardId = None
	favoritePin: bool = False
