from sqlalchemy.exc import IntegrityError

from .distributed_lock import DistributedLock


class DatabaseDistributedLock(DistributedLock):

	def __init__(self):
		pass

	def lock(self):
		pass  # todo

	def try_lock(self, timeout: int):
		pass  # todo

	def try_lock_nowait(self) -> bool:
		try:
			return True
		except IntegrityError as e:
			return False

	def unlock(self):
		pass  # todo
