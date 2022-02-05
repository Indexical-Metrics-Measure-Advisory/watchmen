from typing import List

from pydantic import BaseModel

from watchmen_model.common import Auditable, ConnectedSpaceId, LastVisit, SpaceId, SubjectId, UserBasedTuple


class ConnectedSpace(UserBasedTuple, Auditable, LastVisit, BaseModel):
	connectId: ConnectedSpaceId = None
	spaceId: SpaceId = None
	name: str = None
	subjectIds: List[SubjectId] = []
	isTemplate: bool = False
