from abc import abstractmethod
from datetime import datetime
from logging import getLogger
from os import getpid
from random import randrange
from socket import AF_INET, SOCK_DGRAM, socket
from threading import Thread
from typing import List

from pydantic import BaseModel
from time import sleep

from watchmen_storage.snowflake_worker_id_generator import WorkerIdGenerator

logger = getLogger(__name__)


class WorkerFirstDeclarationException(Exception):
	pass


def get_host_ip() -> str:
	s = None
	ip = None
	try:
		s = socket(AF_INET, SOCK_DGRAM)
		s.connect(('8.8.8.8', 80))
		ip = s.getsockname()[0]
	finally:
		if s is not None:
			s.close()
		return ip


class CompetitiveWorker(BaseModel):
	ip: str = get_host_ip()
	processId: str = str(getpid())
	dataCenterId: int
	workerId: int
	registeredAt: datetime = datetime.now().replace(tzinfo=None)
	lastBeatAt: datetime = None


def default_heart_beat_interval() -> int:
	"""
	:return: in seconds
	"""
	return 30


class CompetitiveWorkerIdGenerator:
	worker: CompetitiveWorker = None

	def __init__(self, data_center_id: int = 0, heart_beat_interval: int = default_heart_beat_interval()):
		# will not check sanity of data center id here
		self.data_center_id = data_center_id
		self.heart_beat_interval = heart_beat_interval
		self.worker = self.create_worker()
		# start heart beat
		Thread(target=self.heart_beat, args=(self,), daemon=True).start()

	@abstractmethod
	def first_declare_myself(self, worker: CompetitiveWorker) -> None:
		"""
		first declare me, implement me
		"""
		pass

	def create_worker(self):
		# create a worker
		try:
			worker = CompetitiveWorker(dataCenterId=self.data_center_id, workerId=self.create_worker_id())
			self.first_declare_myself(worker)
			return worker
		except WorkerFirstDeclarationException:
			return self.create_worker()

	@staticmethod
	def random_worker_id() -> int:
		return randrange(0, 1024)

	@abstractmethod
	def acquire_used_worker_ids(self) -> List[int]:
		"""
		acquire used worker ids, implement me
		:return: used worker ids
		"""
		pass

	def create_worker_id(self) -> int:
		used_worker_ids = self.acquire_used_worker_ids()
		# random a worker id, return it when it is not used
		new_worker_id = CompetitiveWorkerIdGenerator.random_worker_id()
		while new_worker_id in used_worker_ids:
			new_worker_id = CompetitiveWorkerIdGenerator.random_worker_id()
		# return
		return new_worker_id

	@abstractmethod
	def declare_myself(self, worker: CompetitiveWorker) -> None:
		"""
		declare me is alive, implement me
		"""
		pass

	def heart_beat(self):
		try:
			while True:
				self.declare_myself(self.worker)
				sleep(self.heart_beat_interval)
		finally:
			# release in-memory worker, will raise exception only if somebody calls me later
			del self.worker
			logger.warning(f'Competitive worker id generator[{self.worker}] heart beat stopped.')

	def generate(self) -> int:
		"""
		generate snowflake worker id
		"""
		return self.worker.workerId


def competitive_worker_id(generator: CompetitiveWorkerIdGenerator) -> WorkerIdGenerator:
	"""
	create a worker id generator which delegate to given competitive generator
	"""
	return lambda: generator.generate()
