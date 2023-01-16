from sqlalchemy.exc import IntegrityError

from watchmen_collector_kernel.model import CollectorCompetitiveLock
from watchmen_collector_kernel.service import get_collector_competitive_lock_service
from watchmen_storage import TransactionalStorageSPI


class CompetitiveLockService:

	def __init__(self, storage: TransactionalStorageSPI):
		self.lockService = get_collector_competitive_lock_service(storage)

	def try_lock_nowait(self, lock: CollectorCompetitiveLock) -> bool:
		try:
			self.lockService.insert_one(lock)
			return True
		except IntegrityError:
			return False

	def unlock(self, lock: CollectorCompetitiveLock) -> bool:
		self.lockService.delete_by_id(lock.lockId)
		return True


def get_competitive_lock_service(storage: TransactionalStorageSPI) -> CompetitiveLockService:
	return CompetitiveLockService(storage)
