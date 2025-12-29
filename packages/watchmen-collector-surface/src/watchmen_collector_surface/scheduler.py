from apscheduler.schedulers.background import BackgroundScheduler

from .settings import ask_s3_connector_settings
from watchmen_collector_surface.cdc.monitor_event import CollectorEventListener
from watchmen_collector_surface.cdc.post_json import PostJsonService
from watchmen_collector_surface.cdc.record_to_json import RecordToJsonService
from watchmen_collector_surface.cdc.table_extractor import TableExtractor
from watchmen_collector_surface.connects import S3Connector
from watchmen_collector_surface.task import TaskListener, CleanOfTimeout, create_collector_cache_update_thread


class JobScheduler:

	def __init__(self):
		self.scheduler = BackgroundScheduler()

	def init_collector_jobs(self):
		TableExtractor().create_thread(self.scheduler)
		RecordToJsonService().create_thread(self.scheduler)
		PostJsonService().create_thread(self.scheduler)
		CollectorEventListener().create_thread(self.scheduler)

	def init_collector_cache_update(self):
		create_collector_cache_update_thread(self.scheduler)
	
	def init_task_jobs(self):
		TaskListener().create_thread(self.scheduler)

	def init_clean_up_job(self):
		CleanOfTimeout().create_thread(self.scheduler)

	def init_s3_connector_job(self):
		S3Connector(ask_s3_connector_settings()).create_job(self.scheduler)

	def start(self):
		self.scheduler.start()

	def shutdown(self):
		self.scheduler.shutdown()

	def get_scheduler(self) -> BackgroundScheduler:
		return self.scheduler


job_scheduler = JobScheduler()


def ask_job_scheduler() -> JobScheduler:
	return job_scheduler
