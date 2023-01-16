from datetime import date, datetime, timedelta
from logging import getLogger
from threading import Thread
from typing import List

from time import sleep

from watchmen_collector_kernel.service import get_collector_competitive_lock_service
from watchmen_collector_kernel.model import CollectorCompetitiveLock
from watchmen_meta.common import ask_meta_storage


class CleanCompetitiveLock:

	def __init__(self):
		self.lock_service = get_collector_competitive_lock_service(ask_meta_storage())
		self.processed_date = []
		self.cleanTaskInterval = 3600

	def run(self):
		try:
			while True:
				self.clean_lock()
				sleep(self.cleanTaskInterval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			sleep(30)
			self.restart()

	def clean_lock(self):
		query_datetime = datetime.now()
		delta = timedelta(
			hours=query_datetime.hour,
			minutes=query_datetime.minute,
			seconds=query_datetime.second,
			microseconds=query_datetime.microsecond)
		query_date = query_datetime.date() - delta
		if self.is_processed(query_date):
			return "Done"
		else:
			locks = self.get_lock_list(query_date)
			for lock in locks:
				self.lock_service.delete_by_id(lock.lockId)
			self.processed_date.append(query_date.strftime('%Y-%m-%d'))

	def get_lock_list(self, clean_date) -> List[CollectorCompetitiveLock]:
		return self.lock_service.find_overtime_lock(clean_date)

	def is_processed(self, query_date: date) -> bool:
		date_str = query_date.strftime('%Y-%m-%d')
		if date_str in self.processed_date:
			return True
		else:
			return False

	def restart(self):
		Thread(target=CleanCompetitiveLock.run, args=(self,), daemon=True).start()


def init_task_housekeeping():
	clean_lock = CleanCompetitiveLock()
	Thread(target=CleanCompetitiveLock.run, args=(clean_lock,), daemon=True).start()
