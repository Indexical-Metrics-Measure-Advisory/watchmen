import asyncio


def run(async_func):
	try:
		run_with_running_loop(async_func)
	except RuntimeError:
		run_with_new_loop(async_func)


def run_with_running_loop(async_func):
	loop = asyncio.get_running_loop()
	task = loop.create_task(async_func)
	asyncio.gather(task)


def run_with_new_loop(async_func):
	asyncio.run(async_func)
