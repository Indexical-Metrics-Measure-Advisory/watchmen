from datetime import datetime

from pydantic import BaseModel

from .tuple_ids import UserId


class Storable:
	pass


class Auditable(Storable, BaseModel):
	createdAt: datetime = datetime.now().replace(tzinfo=None)
	createdBy: UserId = None
	lastModifiedAt: datetime = datetime.now().replace(tzinfo=None)
	lastModifiedBy: UserId = None


class OptimisticLock(Storable, BaseModel):
	version: int = 1
