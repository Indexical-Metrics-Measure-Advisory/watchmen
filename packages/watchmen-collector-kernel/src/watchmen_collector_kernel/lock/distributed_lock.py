from abc import ABC, abstractmethod


class DistributedLock(ABC):
	@abstractmethod
	def lock(self):
		pass

	@abstractmethod
	def try_lock(self, timeout: int):
		pass

	@abstractmethod
	def try_lock_nowait(self):
		pass

	@abstractmethod
	def unlock(self):
		pass
