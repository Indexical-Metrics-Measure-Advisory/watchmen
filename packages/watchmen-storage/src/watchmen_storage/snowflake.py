from time import time

from .snowflake_worker_id_generator import WorkerIdGenerator

# noinspection SpellCheckingInspection
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


class InvalidSystemClockException(Exception):
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
		assert generate_worker_id is not None, 'Worker id generator cannot be none.'
		worker_id = generate_worker_id()
		# sanity check
		if worker_id > MAX_WORKER_ID or worker_id < 0:
			raise ValueError(
				f'Worker id invalid, it must be between [0, {MAX_WORKER_ID}] and passed by [{worker_id}] .')

		# initialize
		self.dataCenterId = data_center_id
		self.workerId = worker_id
		self.sequence = 0
		self.lastTimestamp = -1

	def next_id(self) -> int:
		timestamp = generate_timestamp()

		if timestamp < self.lastTimestamp:
			# incorrect timestamp
			# raise InvalidSystemClockException
			# use current time stamp
			timestamp = self.lastTimestamp

		if timestamp == self.lastTimestamp:
			# exactly in same timestamp, increase sequence
			# and increase timestamp when sequence reaches the max value
			self.sequence = (self.sequence + 1) & MAX_SEQUENCE
			if self.sequence == 0:
				timestamp = acquire_next_millisecond(self.lastTimestamp)
				self.lastTimestamp = timestamp
		else:
			# already beyonds in-memory timestamp, reset in-memory
			self.sequence = 0
			self.lastTimestamp = timestamp

		return \
			((timestamp - TWEPOCH) << TIMESTAMP_LEFT_SHIFT) | \
			(self.dataCenterId << DATACENTER_ID_SHIFT) | \
			(self.workerId << WORKER_ID_SHIFT) | \
			self.sequence
