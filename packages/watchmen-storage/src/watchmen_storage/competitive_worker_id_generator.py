from abc import abstractmethod
from datetime import datetime
from enum import Enum
from logging import getLogger
from os import getpid
from random import randrange
from socket import AF_INET, SOCK_DGRAM, socket
from threading import Thread
from typing import Callable, List, Optional

from pydantic import BaseModel
from time import sleep

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


class CompetitiveWorker(BaseModel):
	ip: Optional[str] = get_host_ip()
	processId: Optional[str] = str(getpid())
	dataCenterId: int = None
	workerId: int = None
	registeredAt: Optional[datetime] = datetime.now().replace(tzinfo=None)
	lastBeatAt: datetime = None


def default_heart_beat_interval() -> int:
	"""
	:return: in seconds
	"""
	return 30


def default_worker_creation_retry_times() -> int:
	return 3


class CompetitiveWorkerShutdownSignal(Enum):
	EXIT = 1,
	EXCEPTION_RAISED = 2,


CompetitiveWorkerRestarter = Callable[[], None]
CompetitiveWorkerShutdownListener = Callable[[CompetitiveWorkerShutdownSignal, CompetitiveWorkerRestarter], None]


class CompetitiveWorkerIdGenerator:
	worker: CompetitiveWorker = None
	first_declare_times: int = 0

	def __init__(
			self,
			data_center_id: int = 0,
			heart_beat_interval: int = default_heart_beat_interval(),
			worker_creation_retry_times: int = default_worker_creation_retry_times(),
			shutdown_listener: CompetitiveWorkerShutdownListener = None
	):
		# will not check sanity of data center id here
		self.data_center_id = data_center_id
		self.heart_beat_interval = heart_beat_interval
		self.worker_creation_retry_times = worker_creation_retry_times
		self.handle_shutdown = shutdown_listener
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
			self.first_declare_times += 1
			worker = CompetitiveWorker(dataCenterId=self.data_center_id, workerId=self.create_worker_id())
			self.first_declare_myself(worker)
			return worker
		except WorkerFirstDeclarationException:
			if self.first_declare_times <= self.worker_creation_retry_times:
				return self.create_worker()
			else:
				raise WorkerCreationException(
					f'Failed to create worker[dataCenterId={self.data_center_id}], '
					f'reaches maximum retry times[{self.worker_creation_retry_times}]')

	def try_create_worker(self):
		self.first_declare_times = 0
		self.worker = self.create_worker()
		del self.first_declare_times
		# start heart beat
		Thread(target=self.heart_beat, args=(self,), daemon=True).start()

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
				sleep(self.heart_beat_interval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			self.handle_shutdown(CompetitiveWorkerShutdownSignal.EXCEPTION_RAISED, self.try_create_worker)
		else:
			# heart beat stopped with no exception, release signal
			self.handle_shutdown(CompetitiveWorkerShutdownSignal.EXIT, self.try_create_worker)
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
