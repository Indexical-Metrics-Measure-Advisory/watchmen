import logging
from time import sleep
from typing import List

from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.model import ScheduledTask, Status
from watchmen_collector_kernel.service import get_task_service
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from .handler import pipeline_data
from watchmen_collector_surface.settings import ask_fastapi_job, ask_task_listener_wait


logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


class TaskListener:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.task_service = get_task_service(self.storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)

	def create_thread(self, scheduler=None) -> None:
		scheduler.add_job(TaskListener.event_loop_run, 'interval', seconds=ask_task_listener_wait(), args=(self,))

	def event_loop_run(self):
		try:
			self.task_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

	# noinspection PyMethodMayBeStatic
	def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
		task.status = status
		return task

	def find_tasks_and_locked(self) -> List[ScheduledTask]:
		self.scheduled_task_service.begin_transaction()
		try:
			tasks = self.scheduled_task_service.find_tasks_and_locked()
			results = ArrayHelper(tasks).map(
				lambda task: self.change_status(task, Status.EXECUTING.value)
			).map(
				lambda task: self.scheduled_task_service.update(task)
			).to_list()
			self.scheduled_task_service.commit_transaction()
			return results
		finally:
			self.scheduled_task_service.close_transaction()

	def task_listener(self) -> None:
		unfinished_tasks = self.find_tasks_and_locked()
		if len(unfinished_tasks) == 0:
			if not ask_fastapi_job():
				sleep(5)
		else:
			for unfinished_task in unfinished_tasks:
				if self.task_service.is_dependencies_finished(unfinished_task):
					self.task_service.consume_task(unfinished_task, pipeline_data)
				else:
					self.scheduled_task_service.update_task(self.change_status(unfinished_task, Status.INITIAL.value))

	# noinspection PyMethodMayBeStatic
	def is_finished(self, task: ScheduledTask) -> bool:
		return task.isFinished
