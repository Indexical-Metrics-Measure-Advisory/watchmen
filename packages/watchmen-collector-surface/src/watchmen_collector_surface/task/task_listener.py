import logging
from logging import getLogger
from threading import Thread

from apscheduler.schedulers.background import BackgroundScheduler
from time import sleep

from watchmen_collector_kernel.model import ScheduledTask
from watchmen_collector_kernel.service import try_lock_nowait, unlock, get_task_service
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from .handler import pipeline_data
from ..settings import ask_fastapi_job, ask_task_listener

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)
scheduler = BackgroundScheduler(logger=None)


def init_task_listener():
	TaskListener().create_thread()


class TaskListener:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principle_service)
		self.task_service = get_task_service(self.storage,
		                                     self.snowflake_generator,
		                                     self.principle_service)

	def create_thread(self) -> None:
		Thread(target=TaskListener.run, args=(self,), daemon=True).start()
		if ask_fastapi_job():
			scheduler.add_job(TaskListener.run, 'interval', seconds=ask_task_listener(),args=(self,))
			scheduler.start()
		else:
			Thread(target=TaskListener.run, args=(self,), daemon=True).start()

	def run(self):
		try:
			while True:
				self.task_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	def task_listener(self) -> None:
		unfinished_tasks = self.scheduled_task_service.find_partial_tasks()
		if len(unfinished_tasks) == 0:
			sleep(5)
		for unfinished_task in unfinished_tasks:
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         unfinished_task.resourceId,
			                         unfinished_task.tenantId)
			try:
				if try_lock_nowait(self.competitive_lock_service, lock):
					if self.scheduled_task_service.is_existed(unfinished_task):
						if self.task_service.is_dependencies_finished(unfinished_task):
							self.task_service.consume_task(unfinished_task, pipeline_data)
							break
						else:
							continue
			finally:
				unlock(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def is_finished(self, task: ScheduledTask) -> bool:
		return task.isFinished
