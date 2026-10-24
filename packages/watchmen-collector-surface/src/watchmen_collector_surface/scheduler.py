import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler

from .settings import ask_s3_connector_settings
from watchmen_collector_surface.cdc.monitor_event import CollectorEventListener
from watchmen_collector_surface.cdc.post_json import PostJsonService
from watchmen_collector_surface.cdc.record_to_json import RecordToJsonService
from watchmen_collector_surface.cdc.table_extractor import TableExtractor
from watchmen_collector_surface.connects import S3Connector
from watchmen_collector_surface.task import TaskListener, CleanOfTimeout, create_collector_cache_update_thread

logger = logging.getLogger(__name__)


class JobScheduler:

	def __init__(self):
		self.scheduler = BackgroundScheduler()
		self.event_listener: Optional[CollectorEventListener] = None
		self.pickup_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix='collector-event-pickup')
		self.pickup_lock = threading.Lock()
		self.pickup_running = set()
		self.pickup_pending = set()
		self.pickup_shutdown = False

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
		if self.event_listener is None:
			return
		with self.pickup_lock:
			if self.pickup_shutdown:
				return
			if tenant_id in self.pickup_running:
				self.pickup_pending.add(tenant_id)
				return
			self.pickup_running.add(tenant_id)
			try:
				self.pickup_executor.submit(self.pickup_event, tenant_id)
			except Exception as e:
				self.pickup_running.discard(tenant_id)
				self.pickup_pending.discard(tenant_id)
				logger.error(f'Failed to schedule event pickup, tenant id: {tenant_id}, error: {str(e)}',
				             exc_info=True, stack_info=True)

	def pickup_event(self, tenant_id) -> None:
		while True:
			listener = None
			try:
				listener = CollectorEventListener()
				listener.pickup_event(tenant_id)
			except Exception as e:
				logger.error(f'Immediate event pickup failed, tenant id: {tenant_id}, error: {str(e)}',
				             exc_info=True, stack_info=True)
			finally:
				if listener is not None:
					try:
						listener.storage.close()
					except Exception as e:
						logger.error(f'Failed to close event pickup storage, tenant id: {tenant_id}, error: {str(e)}',
						             exc_info=True, stack_info=True)
			with self.pickup_lock:
				if tenant_id in self.pickup_pending:
					self.pickup_pending.discard(tenant_id)
				else:
					self.pickup_running.discard(tenant_id)
					return

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
		with self.pickup_lock:
			self.pickup_shutdown = True
		try:
			self.scheduler.shutdown()
		finally:
			self.pickup_executor.shutdown(wait=True, cancel_futures=True)

	def get_scheduler(self) -> BackgroundScheduler:
		return self.scheduler


job_scheduler = JobScheduler()


def ask_job_scheduler() -> JobScheduler:
	return job_scheduler
