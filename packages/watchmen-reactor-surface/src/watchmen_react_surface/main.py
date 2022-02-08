from .connectors import init_kafka, init_rabbitmq
from .settings import ask_kafka_connector_enabled, ask_kafka_connector_settings, ask_rabbitmq_connector_enabled, \
	ask_rabbitmq_connector_settings


class ReactorSurface:
	@staticmethod
	def init():
		ReactorSurface.init_kafka_connector()
		ReactorSurface.init_rabbitmq_connector()

	@staticmethod
	def init_kafka_connector() -> None:
		if ask_kafka_connector_enabled():
			init_kafka(ask_kafka_connector_settings())

	@staticmethod
	def init_rabbitmq_connector() -> None:
		if ask_rabbitmq_connector_enabled():
			init_rabbitmq(ask_rabbitmq_connector_settings())
