from typing import List, Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import ConnectedSpaceId, DashboardId, DerivedObjectiveId, LastVisit, UserBasedTuple


class Favorite(ExtendedBaseModel, UserBasedTuple, LastVisit):
	connectedSpaceIds: Optional[List[ConnectedSpaceId]] = []
	dashboardIds: Optional[List[DashboardId]] = []
	derivedObjectiveIds: Optional[List[DerivedObjectiveId]] = []
