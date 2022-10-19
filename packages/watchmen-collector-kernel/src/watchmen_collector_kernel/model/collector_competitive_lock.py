from datetime import datetime
from typing import Optional

from watchmen_model.common import CollectorCompetitiveLockId, Storable, TenantId
from watchmen_utilities import get_current_time_in_seconds


class CollectorCompetitiveLock(Storable):
	lockId: CollectorCompetitiveLockId
	resourceId: str
	modelName: str
	objectId: str
	registeredAt: Optional[datetime] = get_current_time_in_seconds()
	tenantId: TenantId
	status: int = 0  # 0-start 1-end
