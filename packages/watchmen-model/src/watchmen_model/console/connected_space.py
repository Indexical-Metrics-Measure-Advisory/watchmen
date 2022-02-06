from pydantic import BaseModel

from watchmen_model.common import Auditable, ConnectedSpaceId, LastVisit, SpaceId, UserBasedTuple


class ConnectedSpace(UserBasedTuple, Auditable, LastVisit, BaseModel):
	connectId: ConnectedSpaceId = None
	spaceId: SpaceId = None
	name: str = None
	isTemplate: bool = False
