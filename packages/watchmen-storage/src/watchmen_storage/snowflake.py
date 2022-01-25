from abc import abstractmethod
from datetime import datetime
from logging import getLogger
from os import getpid
from random import randrange
from socket import AF_INET, SOCK_DGRAM, socket
from threading import Thread
from typing import Callable, List

from pydantic import BaseModel
from time import sleep, time

logger = getLogger(__name__)

WorkerIdGenerator = Callable[[], int]


def immutable_worker_id(worker_id: int) -> WorkerIdGenerator:
	"""
	create a worker id generator which always returns the given one
	"""
	return lambda: worker_id


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


class SnowflakeWorker(BaseModel):
	ip: str = get_host_ip()
	processId: str = str(getpid())
	dataCenterId: int
	workerId: int
	registeredAt: datetime = datetime.now().replace(tzinfo=None)
	lastBeatAt: datetime = None


class CompetitiveWorkerIdGenerator:
	worker: SnowflakeWorker = None

	def __init__(self, data_center_id: int):
		# will not check sanity of data center id here
		self.data_center_id = data_center_id
		self.worker = self.create_worker()
		# start heart beat
		Thread(target=self.heart_beat, args=(self,), daemon=True).start()

	def create_worker(self):
		# create a worker
		worker = SnowflakeWorker(dataCenterId=self.data_center_id, workerId=self.create_worker_id())
		self.declare_myself(worker)
		return worker

	@staticmethod
	def random_worker_id() -> int:
		return randrange(0, 1024)

	@abstractmethod
	def create_worker_id(self) -> int:
		used_worker_ids = self.acquire_used_worker_ids()
		# random a worker id, return it when it is not used
		new_worker_id = CompetitiveWorkerIdGenerator.random_worker_id()
		while new_worker_id in used_worker_ids:
			new_worker_id = CompetitiveWorkerIdGenerator.random_worker_id()
		# return
		return new_worker_id

	@abstractmethod
	def acquire_used_worker_ids(self) -> List[int]:
		"""
		acquire used worker ids, implement me
		:return:
		"""
		pass

	@abstractmethod
	def declare_myself(self, worker: SnowflakeWorker) -> None:
		"""
		declare me is alive, implement me
		"""
		pass

	def heart_beat(self):
		try:
			while True:
				self.declare_myself(self.worker)
				sleep(30)
		finally:
			# release in-memory worker, will cause exception only if somebody calls me later
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


TWEPOCH = 1420041600000
# 0 - 3, 4 data centers maximum
DATACENTER_ID_BITS = 2
# 0 - 1023, 1024 workers maximum per data center
WORKER_ID_BITS = 10
# 0 - 1023, 1024 sequence numbers per millisecond
SEQUENCE_BITS = 10
MAX_WORKER_ID = -1 ^ (-1 << WORKER_ID_BITS)  # 2**10-1 0b1111111111
MAX_DATACENTER_ID = -1 ^ (-1 << DATACENTER_ID_BITS)
MAX_SEQUENCE = -1 ^ (-1 << SEQUENCE_BITS)
WORKER_ID_SHIFT = SEQUENCE_BITS
DATACENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS
TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS


class InvalidSystemClock(Exception):
	pass


def generate_timestamp() -> int:
	return int(time() * 1000)


def acquire_next_millisecond(last_timestamp):
	timestamp = generate_timestamp()

	while timestamp <= last_timestamp:
		timestamp = generate_timestamp()

	return timestamp


class SnowflakeGenerator:
	"""
	snowflake id generator
	"""

	def __init__(self, data_center_id: int = 0, generate_worker_id: WorkerIdGenerator = None):
		"""
		:param data_center_id: data center id, [0, 3]
		:param generate_worker_id: a function returns worker id, [0, 1023]
		"""

		# sanity check
		if data_center_id > MAX_DATACENTER_ID or data_center_id < 0:
			raise ValueError(
				f'Data center id invalid, it must be between [0, {MAX_DATACENTER_ID}] and passed by [{data_center_id}] .')

		# compute worker id
		assert generate_worker_id is not None, 'Worker id generator cannot be null.'
		worker_id = generate_worker_id()
		# sanity check
		if worker_id > MAX_WORKER_ID or worker_id < 0:
			raise ValueError(
				f'Worker id invalid, it must be between [0, {MAX_WORKER_ID}] and passed by [{worker_id}] .')

		# initialize
		self.data_center_id = data_center_id
		self.worker_id = worker_id
		self.sequence = 0
		self.last_timestamp = -1

	def next_id(self) -> int:
		timestamp = generate_timestamp()

		if timestamp < self.last_timestamp:
			# incorrect timestamp
			raise InvalidSystemClock
		elif timestamp == self.last_timestamp:
			# exactly in same timestamp, increase sequence
			# and increase timestamp when sequence reaches the max value
			self.sequence = (self.sequence + 1) & MAX_SEQUENCE
			if self.sequence == 0:
				timestamp = acquire_next_millisecond(self.last_timestamp)
				self.last_timestamp = timestamp
		else:
			# already beyonds in-memory timestamp, reset in-memory
			self.sequence = 0
			self.last_timestamp = timestamp

		return \
			((timestamp - TWEPOCH) << TIMESTAMP_LEFT_SHIFT) | \
			(self.data_center_id << DATACENTER_ID_SHIFT) | \
			(self.worker_id << WORKER_ID_SHIFT) | \
			self.sequence
