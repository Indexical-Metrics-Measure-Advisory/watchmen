from sqlalchemy.exc import IntegrityError

from .distributed_lock import DistributedLock
from .oss_collector_lock_service import OssCollectorLockService
from watchmen_collector_kernel.model import OSSCollectorCompetitiveLock


class UniqueKeyDistributedLock(DistributedLock):
	
	def __init__(self, lock: OSSCollectorCompetitiveLock, lock_service: OssCollectorLockService):
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
	
	"""
	def unlock(self):
		self.lockService.delete_by_id(self.lock.lockId)
	"""
	
	def unlock(self):
		self.lock.status = 1
		self.lockService.update_one(self.lock)


def get_unique_key_distributed_lock(lock: OSSCollectorCompetitiveLock,
                                    lock_service: OssCollectorLockService) -> UniqueKeyDistributedLock:
	return UniqueKeyDistributedLock(lock=lock, lock_service=lock_service)
