import asyncio
import atexit
from concurrent.futures import ThreadPoolExecutor
from typing import Awaitable, TypeVar

T = TypeVar('T')

# A single-worker thread pool is enough: run() callers need the coroutine driven to
# completion synchronously, not concurrently with each other. Reusing one thread
# avoids the cost of spawning a thread per call.
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='async-run')
# Ensure the worker thread is joined cleanly on interpreter shutdown, so an
# in-flight run_until_complete does not emit "Event loop is closed" warnings.
atexit.register(_executor.shutdown, wait=False)


def run(async_func: Awaitable[T]) -> T:
	"""
	Run a coroutine to completion synchronously and return its result.

	Unlike the previous fire-and-forget implementation, this always waits for the
	coroutine to finish (and propagates its exceptions) regardless of whether the
	caller already runs inside an event loop. Callers that depend on the result or
	on raised exceptions (e.g. KafkaExternalWriter.run, monitor log invocation) are
	now safe under both synchronous and asynchronous pipelines.
	"""
	try:
		asyncio.get_running_loop()
	except RuntimeError:
		# No running loop in the current thread: just create one and block on it.
		return asyncio.run(async_func)
	# A loop is already running in this thread. We cannot call run_until_complete on
	# it (it would raise "This event loop is already running"), so drive the
	# coroutine on a dedicated thread with its own loop and block until it finishes.
	return _run_in_thread(async_func)


def _run_in_thread(async_func: Awaitable[T]) -> T:
	def _drive() -> T:
		loop = asyncio.new_event_loop()
		try:
			return loop.run_until_complete(async_func)
		finally:
			loop.close()

	return _executor.submit(_drive).result()


def run_with_running_loop(async_func: Awaitable[T]) -> T:
	"""
	Deprecated alias kept for backward compatibility. Behaves like run() now
	(synchronous, blocks until completion) instead of the old fire-and-forget.
	"""
	return run(async_func)


def run_with_new_loop(async_func: Awaitable[T]) -> T:
	return asyncio.run(async_func)
