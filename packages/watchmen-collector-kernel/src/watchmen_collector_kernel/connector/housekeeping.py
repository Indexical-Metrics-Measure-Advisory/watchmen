from datetime import datetime, date, timedelta
from logging import getLogger
from threading import Thread
from typing import List

from watchmen_collector_kernel.common import S3CollectorSettings
from watchmen_collector_kernel.lock import get_oss_collector_lock_service
from watchmen_collector_kernel.model import OSSCollectorCompetitiveLock
from time import sleep


class CleanTask:
	
	def __init__(self,  settings: S3CollectorSettings):
		self.lock_service = get_oss_collector_lock_service()
		self.processed_date = []
		self.cleanTaskInterval = settings.clean_task_interval
	
	def run(self):
		try:
			while True:
				self.clean_task()
				sleep(self.cleanTaskInterval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			self.restart()
	
	def clean_task(self):
		query_datetime = datetime.now()
		query_date = query_datetime.date() - timedelta(hours=query_datetime.hour,
		                                               minutes=query_datetime.minute,
		                                               seconds=query_datetime.second,
		                                               microseconds=query_datetime.microsecond)
		if self.is_processed(query_date):
			return "Done"
		else:
			tasks = self.get_task_list(query_date)
			for task in tasks:
				self.lock_service.delete_by_id(task.lockId)
			self.processed_date.append(query_date.strftime('%Y-%m-%d'))
	
	def get_task_list(self, clean_date) -> List[OSSCollectorCompetitiveLock]:
		return self.lock_service.find_completed_task(clean_date)
	
	def is_processed(self, query_date: date) -> bool:
		date_str = query_date.strftime('%Y-%m-%d')
		if date_str in self.processed_date:
			return True
		else:
			return False
	
	def restart(self):
		Thread(target=CleanTask.run, args=(self,), daemon=True).start()


def init_task_housekeeping(settings: S3CollectorSettings):
	cleanTask = CleanTask(settings)
	Thread(target=CleanTask.run, args=(cleanTask,), daemon=True).start()
