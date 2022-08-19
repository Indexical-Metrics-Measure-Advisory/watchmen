from sqlalchemy.exc import IntegrityError

from .distributed_lock import DistributedLock
from .lock_service import LockService
from watchmen_collector_kernel.model import ResourceLock


class UniqueKeyDistributedLock(DistributedLock):

	def __init__(self, lock: ResourceLock, lock_service: LockService):
		self.lock = lock
		self.lockService = lock_service

	def lock(self):
		pass  # todo

	def try_lock(self, timeout: int):
		pass  # todo

	def try_lock_nowait(self) -> bool:
		try:
			self.lockService.insert_one(self.lock)
			return True
		except IntegrityError as e:
			return False

	def unlock(self):
		self.lockService.delete_by_id(self.lock.lockId)
	

def get_unique_key_distributed_lock(lock: ResourceLock, lock_service: LockService) -> UniqueKeyDistributedLock:
	return UniqueKeyDistributedLock(lock=lock, lock_service=lock_service)
