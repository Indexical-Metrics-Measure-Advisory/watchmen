from watchmen_collector_kernel.service import init_lock_clean
from .cdc import init_table_extractor, init_record_listener, init_json_listener, init_event_listener
from .settings import ask_s3_collector_enabled, \
	ask_s3_connector_settings, ask_query_based_change_data_capture_enabled, ask_task_listener_enabled
from watchmen_collector_surface.connects import init_s3_collector
from .task import init_task_listener


class CollectorSurface:

	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_query_based_change_data_capture(self) -> None:
		if ask_query_based_change_data_capture_enabled():
			init_table_extractor()
			init_record_listener()
			init_json_listener()
			init_event_listener()

	# noinspection PyMethodMayBeStatic
	def init_task_listener(self) -> None:
		if ask_task_listener_enabled():
			init_task_listener()
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
