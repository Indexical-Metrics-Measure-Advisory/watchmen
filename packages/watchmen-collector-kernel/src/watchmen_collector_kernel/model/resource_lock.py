
from datetime import datetime
from typing import Optional

from watchmen_model.common import LockId, Storable
from watchmen_utilities import get_current_time_in_seconds


class ResourceLock(Storable):
	lockId: LockId
	resourceId: str
	modelName: str
	objectId: str
	registeredAt: Optional[datetime] = get_current_time_in_seconds()
	
	

