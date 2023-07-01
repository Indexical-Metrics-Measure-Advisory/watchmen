from datetime import datetime, timedelta
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_collector_kernel.common import ask_lock_clean_interval, ask_lock_clean_timeout
from watchmen_collector_kernel.storage import get_competitive_lock_service
from watchmen_collector_surface.settings import ask_fastapi_job
from watchmen_meta.common import ask_meta_storage


class LockClean:

	def __init__(self):
		self.lock_service = get_competitive_lock_service(ask_meta_storage())
		self.cleanInterval = ask_lock_clean_interval()
		self.cleanTimeout = ask_lock_clean_timeout()

	def create_thread(self, scheduler=None) -> None:
		if ask_fastapi_job():
			scheduler.add_job(LockClean.event_loop_run, 'interval', seconds=self.cleanInterval, args=(self,))

		else:
			Thread(target=LockClean.run, args=(self,), daemon=True).start()

	def event_loop_run(self):
		try:
			self.clean_lock()
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)

	def run(self):
		try:
			while True:
				self.clean_lock()
				sleep(self.cleanInterval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	def clean_lock(self):
		query_time = datetime.now() - timedelta(seconds=self.cleanTimeout)
		locks = self.lock_service.find_overtime_lock(query_time)
		for lock in locks:
			self.lock_service.delete_by_id(lock.lockId)


def init_lock_clean():
	LockClean().create_thread()
