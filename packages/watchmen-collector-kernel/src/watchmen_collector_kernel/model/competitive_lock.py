from datetime import datetime
from typing import Optional

from watchmen_model.common import CompetitiveLockId, Storable, TenantId


class CompetitiveLock(Storable):
	lockId: CompetitiveLockId
	resourceId: str
	registeredAt: Optional[datetime]
	tenantId: TenantId
