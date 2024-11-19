from typing import List, Optional

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import ConvergenceId, ObjectiveId, OptimisticLock, SpaceId, TenantBasedTuple, UserGroupId, \
	UserId


class UserGroup(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	userGroupId: Optional[UserGroupId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	userIds: Optional[List[UserId]] = None
	spaceIds: Optional[List[SpaceId]] = None
	objectiveIds: Optional[List[ObjectiveId]] = None
	convergenceIds: Optional[List[ConvergenceId]] = None
