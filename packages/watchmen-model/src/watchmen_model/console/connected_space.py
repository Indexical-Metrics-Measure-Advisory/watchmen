from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import Auditable, ConnectedSpaceId, LastVisit, SpaceId, UserBasedTuple


class ConnectedSpace(UserBasedTuple, Auditable, LastVisit, ExtendedBaseModel):
	connectId: Optional[ConnectedSpaceId] = None
	spaceId: Optional[SpaceId] = None
	name: Optional[str] = None
	isTemplate: bool = False
