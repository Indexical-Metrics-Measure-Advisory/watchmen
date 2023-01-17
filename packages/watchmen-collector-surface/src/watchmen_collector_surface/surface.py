from .settings import ask_integrated_record_collector_enabled, ask_s3_collector_enabled, ask_s3_connector_settings
from watchmen_collector_surface.connects import init_collector_integrated_record, init_s3_collector


class CollectorSurface:

	def __init__(self):
		pass

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


collector_surface = CollectorSurface()
