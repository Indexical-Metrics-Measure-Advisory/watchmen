from datetime import datetime, timedelta
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_collector_kernel.common import ask_lock_clean_interval, ask_lock_clean_timeout
from watchmen_collector_kernel.storage import get_competitive_lock_service
from watchmen_meta.common import ask_meta_storage


class LockClean:

	def __init__(self):
		self.lock_service = get_competitive_lock_service(ask_meta_storage())
		self.cleanInterval = ask_lock_clean_interval()
		self.cleanTimeout = ask_lock_clean_timeout()

	def run(self):
		try:
			while True:
				self.clean_lock()
				sleep(self.cleanInterval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.restart()

	def clean_lock(self):
		query_time = datetime.now() - timedelta(seconds=self.cleanTimeout)
		locks = self.lock_service.find_overtime_lock(query_time)
		for lock in locks:
			self.lock_service.delete_by_id(lock.lockId)

	def restart(self):
		Thread(target=LockClean.run, args=(self,), daemon=True).start()


def init_lock_clean():
	lock_clean = LockClean()
	lock_clean.restart()
