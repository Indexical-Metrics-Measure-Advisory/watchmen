from watchmen_collector_kernel.service import init_lock_clean
from .cdc.monitor_event import init_event_listener
from .cdc.post_json import init_json_listener
from .cdc.record_to_json import init_record_listener
from .cdc.table_extractor import init_table_extractor
# from .cdc import init_table_extractor, init_record_listener, init_json_listener, init_event_listener
from .data.task_router import add_collector_job
from .settings import ask_s3_collector_enabled, \
	ask_s3_connector_settings, ask_query_based_change_data_capture_enabled, ask_task_listener_enabled, ask_fastapi_job
from watchmen_collector_surface.connects import init_s3_collector
from .task.task_listener import init_task_listener


# from .task import init_task_listener


class CollectorSurface:

	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_query_based_change_data_capture(self) -> None:
		if ask_query_based_change_data_capture_enabled():
			if ask_fastapi_job():
				add_collector_job()
			else:
				init_table_extractor()
				init_record_listener()
				init_json_listener()
				init_event_listener()
				init_task_listener()

	# noinspection PyMethodMayBeStatic
	def init_task_listener(self) -> None:
		if ask_task_listener_enabled():
			# init_task_listener()
			init_lock_clean()

	# noinspection PyMethodMayBeStatic
	def init_s3_connector(self) -> None:
		if ask_task_listener_enabled() and ask_s3_collector_enabled():
			init_s3_collector(ask_s3_connector_settings())

	def init(self) -> None:
		self.init_task_listener()
		self.init_s3_connector()
		self.init_query_based_change_data_capture()


collector_surface = CollectorSurface()
