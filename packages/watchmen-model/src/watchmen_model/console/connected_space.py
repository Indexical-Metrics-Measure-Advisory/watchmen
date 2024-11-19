from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import Auditable, ConnectedSpaceId, LastVisit, SpaceId, UserBasedTuple


class ConnectedSpace(ExtendedBaseModel, UserBasedTuple, Auditable, LastVisit):
	connectId: Optional[ConnectedSpaceId] = None
	spaceId: Optional[SpaceId] = None
	name: Optional[str] = None
	isTemplate: Optional[bool] = False
