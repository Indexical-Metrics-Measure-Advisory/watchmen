from typing import List

from watchmen_model.common import ConnectedSpaceId, LastVisit, OptimisticLock, SpaceId, SubjectId, UserBasedTuple


class ConnectedSpace(UserBasedTuple, OptimisticLock, LastVisit):
	connectId: ConnectedSpaceId = None
	spaceId: SpaceId = None
	name: str = None
	type: str = None
	subjectIds: List[SubjectId] = []
	isTemplate: bool = False
