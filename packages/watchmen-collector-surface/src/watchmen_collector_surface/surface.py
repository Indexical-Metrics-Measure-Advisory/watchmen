from .cdc import init_table_extractor, init_record_listener, init_json_listener, init_event_listener
from .scheduler import ask_collector_job_scheduler
from .settings import ask_s3_collector_enabled, \
	ask_s3_connector_settings, ask_query_based_change_data_capture_enabled, ask_task_listener_enabled, ask_fastapi_job
from watchmen_collector_surface.connects import init_s3_collector
from .task import init_task_listener, init_clean


class CollectorSurface:

	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_query_based_change_data_capture(self) -> None:
		if ask_query_based_change_data_capture_enabled():
			if ask_fastapi_job():
				scheduler = ask_collector_job_scheduler()
				scheduler.init_collector_jobs()
				scheduler.init_task_jobs()
				scheduler.start()
			else:
				init_table_extractor()
				init_record_listener()
				init_json_listener()
				init_event_listener()
				init_task_listener()
				init_clean()

	# noinspection PyMethodMayBeStatic
	def init_s3_connector(self) -> None:
		if ask_task_listener_enabled() and ask_s3_collector_enabled():
			init_s3_collector(ask_s3_connector_settings())

	def init(self) -> None:
		self.init_s3_connector()
		self.init_query_based_change_data_capture()


collector_surface = CollectorSurface()
