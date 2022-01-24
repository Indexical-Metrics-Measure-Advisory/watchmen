from datetime import datetime
from typing import List

from watchmen.model.common import ConnectedSpaceId, SpaceId, SubjectId, TenantId, Tuple, UserId


class ConnectedSpace(Tuple):
	connectId: ConnectedSpaceId = None
	spaceId: SpaceId = None
	name: str = None
	type: str = None
	subjectIds: List[SubjectId] = []
	isTemplate: bool = False
	userId: UserId = None
	tenantId: TenantId = None
	lastVisitTime: datetime = datetime.now().replace(tzinfo=None)
# subjects: List[Subject] = []
# groupIds: list = []
# topics: List[Topic] = []
