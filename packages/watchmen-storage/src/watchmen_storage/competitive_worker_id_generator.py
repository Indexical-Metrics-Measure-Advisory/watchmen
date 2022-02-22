from abc import abstractmethod
from datetime import datetime
from enum import Enum
from logging import getLogger
from os import getpid
from random import randrange
from socket import AF_INET, SOCK_DGRAM, socket
from threading import Thread
from typing import Callable, List, Optional

from time import sleep

from watchmen_model.common import Storable
from watchmen_utilities import get_current_time_in_seconds
from .snowflake_worker_id_generator import WorkerIdGenerator


class WorkerFirstDeclarationException(Exception):
	pass


class WorkerCreationException(Exception):
	pass


class WorkerDeclarationException(Exception):
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


class CompetitiveWorker(Storable):
	ip: Optional[str] = get_host_ip()
	processId: Optional[str] = str(getpid())
	dataCenterId: int = None
	workerId: int = None
	registeredAt: Optional[datetime] = get_current_time_in_seconds()
	lastBeatAt: datetime = None


def default_heart_beat_interval() -> int:
	"""
	:return: in seconds
	"""
	return 60


def default_worker_creation_retry_times() -> int:
	return 3


class CompetitiveWorkerShutdownSignal(Enum):
	EXIT = 1,
	EXCEPTION_RAISED = 2,


CompetitiveWorkerRestarter = Callable[[], None]
CompetitiveWorkerShutdownListener = Callable[
	[CompetitiveWorkerShutdownSignal, int, int, CompetitiveWorkerRestarter], None
]


class CompetitiveWorkerIdGenerator:
	worker: CompetitiveWorker = None
	firstDeclareTimes: int = 0

	def __init__(
			self,
			data_center_id: int = 0,
			heart_beat_interval: int = default_heart_beat_interval(),
			worker_creation_retry_times: int = default_worker_creation_retry_times(),
			shutdown_listener: CompetitiveWorkerShutdownListener = None
	):
		# will not check sanity of data center id here
		self.dataCenterId = data_center_id
		self.heartBeatInterval = heart_beat_interval
		self.workerCreationRetryTimes = worker_creation_retry_times
		self.handleShutdown = shutdown_listener
		self.try_create_worker()

	@abstractmethod
	def first_declare_myself(self, worker: CompetitiveWorker) -> None:
		"""
		first declare me, implement me
		"""
		pass

	def create_worker(self):
		# create a worker
		try:
			self.firstDeclareTimes += 1
			worker = CompetitiveWorker(dataCenterId=self.dataCenterId, workerId=self.create_worker_id())
			self.first_declare_myself(worker)
			return worker
		except WorkerFirstDeclarationException:
			if self.firstDeclareTimes <= self.workerCreationRetryTimes:
				return self.create_worker()
			else:
				raise WorkerCreationException(
					f'Failed to create worker[dataCenterId={self.dataCenterId}], '
					f'reaches maximum retry times[{self.workerCreationRetryTimes}]')

	def try_create_worker(self):
		self.firstDeclareTimes = 0
		self.worker = self.create_worker()
		del self.firstDeclareTimes
		# start heart beat
		Thread(target=CompetitiveWorkerIdGenerator.heart_beat, args=(self,), daemon=True).start()

	@staticmethod
	def random_worker_id() -> int:
		return randrange(0, 1024)

	@abstractmethod
	def acquire_alive_worker_ids(self) -> List[int]:
		"""
		acquire used worker ids, implement me
		:return: used worker ids
		"""
		pass

	def create_worker_id(self) -> int:
		alive_worker_ids = self.acquire_alive_worker_ids()
		# random a worker id, return it when it is not used
		new_worker_id = CompetitiveWorkerIdGenerator.random_worker_id()
		while new_worker_id in alive_worker_ids:
			new_worker_id = CompetitiveWorkerIdGenerator.random_worker_id()
		# return
		return new_worker_id

	@abstractmethod
	def declare_myself(self, worker: CompetitiveWorker) -> None:
		"""
		declare me is alive, implement me
		"""
		pass

	# noinspection PyUnreachableCode
	def heart_beat(self):
		try:
			while True:
				self.declare_myself(self.worker)
				sleep(self.heartBeatInterval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			self.handleShutdown(
				CompetitiveWorkerShutdownSignal.EXCEPTION_RAISED,
				self.worker.dataCenterId, self.worker.workerId,
				self.try_create_worker
			)
		else:
			# heart beat stopped with no exception, release signal
			self.handleShutdown(
				CompetitiveWorkerShutdownSignal.EXIT,
				self.worker.dataCenterId, self.worker.workerId,
				self.try_create_worker
			)
		finally:
			# release in-memory worker, will raise exception only if somebody calls me later
			del self.worker
			getLogger(__name__).warning(f'Competitive worker id generator[{self.worker}] heart beat stopped.')

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
