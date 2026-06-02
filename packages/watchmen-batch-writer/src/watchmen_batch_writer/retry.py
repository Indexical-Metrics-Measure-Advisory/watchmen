import asyncio
from logging import getLogger
from typing import Awaitable, Callable, TypeVar

logger = getLogger(__name__)

T = TypeVar('T')


async def retry_async(
		operation: Callable[[], Awaitable[T]],
		max_retries: int,
		delay_seconds: float,
		op_name: str = 'operation') -> T:
	"""
	Retry an async operation up to max_retries times with a fixed delay.
	Raises the last exception if all attempts fail.
	"""
	if max_retries < 1:
		max_retries = 1
	last_exc: Exception = RuntimeError(f'{op_name} never executed')
	for attempt in range(1, max_retries + 1):
		try:
			return await operation()
		except Exception as e:
			last_exc = e
			if attempt >= max_retries:
				logger.error(f'{op_name} failed after {attempt} attempts: {e}', exc_info=True)
				break
			logger.warning(
				f'{op_name} failed (attempt {attempt}/{max_retries}): {e}; retrying in {delay_seconds}s')
			await asyncio.sleep(delay_seconds)
	raise last_exc
