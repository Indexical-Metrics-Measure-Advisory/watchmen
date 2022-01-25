from typing import Callable

WorkerIdGenerator = Callable[[], int]


def immutable_worker_id(worker_id: int) -> WorkerIdGenerator:
	"""
	create a worker id generator which always returns the given one
	"""
	return lambda: worker_id
