import asyncio
from typing import Any


def run(async_function) -> Any:
	try:
		return run_with_running_loop(async_function)
	except RuntimeError:
		return run_with_new_loop(async_function)


def run_with_running_loop(async_function) -> Any:
	loop = asyncio.get_running_loop()
	task = loop.create_task(async_function)
	return task


def run_with_new_loop(async_function) -> Any:
	loop = asyncio.new_event_loop()
	try:
		asyncio.set_event_loop(loop)
		result = loop.run_until_complete(async_function)
		return result
	finally:
		asyncio.set_event_loop(None)
		loop.close()
