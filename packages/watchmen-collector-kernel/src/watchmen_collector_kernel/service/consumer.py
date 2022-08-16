from abc import ABC, abstractmethod

from watchmen_collector_kernel.lock import DistributedLock


class Consumer(ABC):

	def __init__(self):
		pass

	@abstractmethod
	def process(self):
		pass

	@abstractmethod
	def pre_process(self) -> bool:
		pass

	@abstractmethod
	def post_process(self):
		pass

	def run(self):
		if self.pre_process():
			try:
				self.process()
			except Exception as e:
				pass
			finally:
				self.post_process()
		else:
			pass  # sleep
