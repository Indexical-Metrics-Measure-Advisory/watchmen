from watchmen_auth import AuthenticationManager
from .connectors import init_kafka, init_rabbitmq
from .settings import ask_kafka_connector_enabled, ask_kafka_connector_settings, ask_rabbitmq_connector_enabled, \
	ask_rabbitmq_connector_settings


class ReactorSurface:
	authentication_manager: AuthenticationManager = None

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

	def init(self, authentication_manager: AuthenticationManager):
		self.authentication_manager = authentication_manager
		self.init_connectors()


surface = ReactorSurface()
