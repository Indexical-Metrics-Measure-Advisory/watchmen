from pydantic import BaseModel

from watchmen_model.common import DashboardId, UserBasedTuple


class LastSnapshot(UserBasedTuple, BaseModel):
	language: str = None
	lastDashboardId: DashboardId = None
	adminDashboardId: DashboardId = None
	favoritePin: bool = False
