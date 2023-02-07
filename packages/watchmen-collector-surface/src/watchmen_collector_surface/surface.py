from .cdc import init_table_extractor, init_record_listener
from .settings import ask_integrated_record_collector_enabled, ask_s3_collector_enabled, \
	ask_s3_connector_settings, ask_query_based_change_data_capture_enabled
from watchmen_collector_surface.connects import init_collector_integrated_record, init_s3_collector


class CollectorSurface:

	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_query_based_change_data_capture(self) -> None:
		if ask_query_based_change_data_capture_enabled():
			init_table_extractor()
			init_record_listener()

	# noinspection PyMethodMayBeStatic
	def init_integrated_record_collector(self) -> None:
		if ask_integrated_record_collector_enabled():
			init_collector_integrated_record()

	# noinspection PyMethodMayBeStatic
	def init_s3_connector(self) -> None:
		if ask_s3_collector_enabled():
			init_s3_collector(ask_s3_connector_settings())

	def init(self) -> None:
		self.init_s3_connector()
		self.init_integrated_record_collector()
		self.init_query_based_change_data_capture()


collector_surface = CollectorSurface()
