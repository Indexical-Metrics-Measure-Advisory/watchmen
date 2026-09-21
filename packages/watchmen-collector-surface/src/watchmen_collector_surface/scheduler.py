import threading
from typing import Optional

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
		self.event_listener: Optional[CollectorEventListener] = None

	def init_collector_jobs(self):
		TableExtractor().create_thread(self.scheduler)
		RecordToJsonService().create_thread(self.scheduler)
		PostJsonService().create_thread(self.scheduler)
		self.event_listener = CollectorEventListener()
		self.event_listener.create_thread(self.scheduler)

	def try_pickup_event_now(self, tenant_id) -> None:
		# nudge the event pickup right after a trigger REST call; without this,
		# the fresh INITIAL event waits for the next MONITOR_EVENT_WAIT tick.
		# no-op on nodes that do not run the event listener (API-only nodes) —
		# there the periodic tick on a collector node stays the pickup path.
		# daemon thread on purpose: extraction may run minutes, and its sync
		# storage calls must stay off the uvicorn event loop
		listener = self.event_listener
		if listener is None:
			return
		threading.Thread(target=listener.pickup_event, args=(tenant_id,), daemon=True).start()

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
