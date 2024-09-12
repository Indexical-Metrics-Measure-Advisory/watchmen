from typing import Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import DashboardId, LastVisit, UserBasedTuple


class LastSnapshot(ExtendedBaseModel, UserBasedTuple, LastVisit):
	language: Optional[str] = None
	lastDashboardId: Optional[DashboardId] = None
	adminDashboardId: Optional[DashboardId] = None
	favoritePin: bool = False
