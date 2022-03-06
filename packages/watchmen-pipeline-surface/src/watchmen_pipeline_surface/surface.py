from watchmen_pipeline_kernel.common import ask_elastic_search_external_writer_enabled, \
	ask_standard_external_writer_enabled
from watchmen_pipeline_kernel.external_writer import init_elastic_search_external_writer, init_standard_external_writer
from .connectors import init_kafka, init_rabbitmq
from .settings import ask_kafka_connector_enabled, ask_kafka_connector_settings, ask_rabbitmq_connector_enabled, \
	ask_rabbitmq_connector_settings


class PipelineSurface:
	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_kafka_connector(self) -> None:
		if ask_kafka_connector_enabled():
			init_kafka(ask_kafka_connector_settings())

	# noinspection PyMethodMayBeStatic
	def init_rabbitmq_connector(self) -> None:
		if ask_rabbitmq_connector_enabled():
			init_rabbitmq(ask_rabbitmq_connector_settings())

	def init_connectors(self) -> None:
		self.init_kafka_connector()
		self.init_rabbitmq_connector()

	# noinspection PyMethodMayBeStatic
	def init_standard_external_writer(self) -> None:
		if ask_standard_external_writer_enabled():
			init_standard_external_writer()

	# noinspection PyMethodMayBeStatic
	def init_elastic_search_external_writer(self) -> None:
		if ask_elastic_search_external_writer_enabled():
			init_elastic_search_external_writer()

	def init_external_writers(self) -> None:
		self.init_standard_external_writer()
		self.init_elastic_search_external_writer()


pipeline_surface = PipelineSurface()
