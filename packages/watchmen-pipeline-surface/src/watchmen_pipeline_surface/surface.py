from watchmen_pipeline_kernel.boot import init_prebuilt_external_writers, init_topic_snapshot_jobs
from .connectors import init_kafka, init_rabbitmq
from .settings import ask_kafka_connector_enabled, ask_kafka_connector_settings, ask_rabbitmq_connector_enabled, \
	ask_rabbitmq_connector_settings, ask_s3_connector_enabled, ask_s3_connector_settings


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

	def init_s3_connector(self) -> None:
		if ask_s3_connector_enabled():
			from watchmen_collector_kernel.connector import init_s3_collector
			init_s3_collector(ask_s3_connector_settings())

	def init_connectors(self) -> None:
		self.init_kafka_connector()
		self.init_rabbitmq_connector()
		self.init_s3_connector()

	# noinspection PyMethodMayBeStatic
	def init_external_writers(self) -> None:
		init_prebuilt_external_writers()

	# noinspection PyMethodMayBeStatic
	def init_topic_snapshot_jobs(self) -> None:
		init_topic_snapshot_jobs()

	def init(self) -> None:
		self.init_connectors()
		self.init_external_writers()
		self.init_topic_snapshot_jobs()


pipeline_surface = PipelineSurface()
