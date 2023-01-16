from datetime import datetime
from typing import Optional

from watchmen_model.common import CollectorCompetitiveLockId, Storable, TenantId


class CollectorCompetitiveLock(Storable):
	lockId: CollectorCompetitiveLockId
	resourceId: str
	registeredAt: Optional[datetime]
	tenantId: TenantId
