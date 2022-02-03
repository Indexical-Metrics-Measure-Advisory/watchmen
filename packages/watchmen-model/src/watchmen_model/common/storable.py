from datetime import datetime

from .model import DataModel
from .tuple_ids import UserId


class Storable(DataModel):
	pass


class Auditable(Storable):
	createdAt: datetime = None
	createdBy: UserId = None
	lastModifiedAt: datetime = None
	lastModifiedBy: UserId = None


class OptimisticLock(Storable):
	version: int = 1


class LastVisit(Storable):
	lastVisitTime: datetime = datetime.now().replace(tzinfo=None, microsecond=0)
