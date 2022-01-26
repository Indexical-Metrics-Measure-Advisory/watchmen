from datetime import datetime
from typing import List

from watchmen_model.common import ConnectedSpaceId, OptimisticLock, SpaceId, SubjectId, TenantId, Tuple, UserId


class ConnectedSpace(Tuple, OptimisticLock):
	connectId: ConnectedSpaceId = None
	spaceId: SpaceId = None
	name: str = None
	type: str = None
	subjectIds: List[SubjectId] = []
	isTemplate: bool = False
	userId: UserId = None
	tenantId: TenantId = None
	lastVisitTime: datetime = datetime.now().replace(tzinfo=None)
