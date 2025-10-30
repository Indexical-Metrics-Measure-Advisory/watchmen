from .scheduler import ask_job_scheduler
from .settings import ask_s3_collector_enabled, ask_query_based_change_data_capture_enabled, ask_task_listener_enabled
from .scheduler import JobScheduler


class CollectorSurface:

	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_task_listener(self, scheduler: JobScheduler) -> None:
		if ask_task_listener_enabled():
			scheduler.init_task_jobs()

	# noinspection PyMethodMayBeStatic
	def init_clean_up(self, scheduler: JobScheduler) -> None:
		if ask_task_listener_enabled():
			scheduler.init_clean_up_job()

	# noinspection PyMethodMayBeStatic
	def init_collector(self, scheduler: JobScheduler) -> None:
		if ask_query_based_change_data_capture_enabled():
			scheduler.init_collector_jobs()

	# noinspection PyMethodMayBeStatic
	def init_s3_connector(self, scheduler: JobScheduler) -> None:
		if ask_s3_collector_enabled():
			scheduler.init_s3_connector_job()

	def init(self) -> None:
		job_scheduler = ask_job_scheduler()
		self.init_task_listener(job_scheduler)
		self.init_clean_up(job_scheduler)
		self.init_collector(job_scheduler)
		self.init_s3_connector(job_scheduler)
		job_scheduler.start()


collector_surface = CollectorSurface()
