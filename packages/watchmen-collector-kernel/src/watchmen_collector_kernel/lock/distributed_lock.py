from abc import ABC, abstractmethod


class DistributedLock(ABC):

	def __init__(self):
		pass

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
