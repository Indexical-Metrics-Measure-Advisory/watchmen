from logging import getLogger
from threading import Thread
from time import sleep

from watchmen_collector_kernel.common import TENANT_ID
from watchmen_collector_kernel.model import ScheduledTask, TaskStatus
from .handler import pipeline_data
from watchmen_collector_kernel.service import try_lock_nowait, unlock, get_task_service
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage


logger = getLogger(__name__)


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

	def run(self):
		try:
			while True:
				self.task_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	def task_listener(self) -> None:
		unfinished_tasks = self.scheduled_task_service.find_unfinished_tasks()
		for unfinished_task in unfinished_tasks:
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         unfinished_task.get('resource_id'),
			                         unfinished_task.get(TENANT_ID))
			try:
				if try_lock_nowait(self.competitive_lock_service, lock):
					# noinspection PyUnresolvedReferences
					task = self.scheduled_task_service.find_task_by_id(unfinished_task.get('task_id'))
					if self.is_finished(task):
						continue
					else:
						if self.task_service.is_dependencies_finished(task.dependencies):
							self.task_service.consume_task(task, pipeline_data)
							break
						else:
							continue
			finally:
				unlock(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def is_finished(self, task: ScheduledTask) -> bool:
		if task.status == TaskStatus.SUCCESS:
			return True
		elif task.status == TaskStatus.FAILED:
			return True
		return False