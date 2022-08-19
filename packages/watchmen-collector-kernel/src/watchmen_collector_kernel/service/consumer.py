from abc import ABC, abstractmethod
from logging import getLogger

from watchmen_collector_kernel.lock import DistributedLock

logger = getLogger(__name__)


class Consumer(ABC):
	
	@abstractmethod
	def process(self, *args, **kwargs):
		pass
	
	@abstractmethod
	def ask_lock(self, distributed_lock: DistributedLock) -> bool:
		pass
	
	@abstractmethod
	def ask_unlock(self, distributed_lock: DistributedLock) -> bool:
		pass

