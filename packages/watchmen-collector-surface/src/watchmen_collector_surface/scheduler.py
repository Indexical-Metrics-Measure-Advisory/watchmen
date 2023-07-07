from apscheduler.schedulers.background import BackgroundScheduler
from watchmen_collector_surface.cdc.monitor_event import CollectorEventListener
from watchmen_collector_surface.cdc.post_json import PostJsonService
from watchmen_collector_surface.cdc.record_to_json import RecordToJsonService
from watchmen_collector_surface.cdc.table_extractor import TableExtractor
from watchmen_collector_surface.task import TaskListener, CleanOfTimeout


class JobScheduler:

	def __init__(self):
		self.scheduler = BackgroundScheduler()

	def init_collector_jobs(self):
		TableExtractor().create_thread(self.scheduler)
		RecordToJsonService().create_thread(self.scheduler)
		PostJsonService().create_thread(self.scheduler)
		CollectorEventListener().create_thread(self.scheduler)

	def init_task_jobs(self):
		TaskListener().create_thread(self.scheduler)
		CleanOfTimeout().create_thread(self.scheduler)

	def start(self):
		self.scheduler.start()

	def shutdown(self):
		self.scheduler.shutdown()


job_scheduler = JobScheduler()


def ask_collector_job_scheduler() -> JobScheduler:
	return job_scheduler
