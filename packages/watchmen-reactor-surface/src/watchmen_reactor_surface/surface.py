from typing import Callable

from watchmen_auth import AuthenticationManager
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .connectors import init_kafka, init_rabbitmq
from .settings import ask_kafka_connector_enabled, ask_kafka_connector_settings, ask_rabbitmq_connector_enabled, \
	ask_rabbitmq_connector_settings


class ReactorSurface:
	retrieve_meta_storage: Callable[[], TransactionalStorageSPI]
	authentication_manager: AuthenticationManager = None
	snowflake_generator: SnowflakeGenerator = None

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

	def init_meta_storage(self, retrieve_meta_storage: Callable[[], TransactionalStorageSPI]) -> None:
		self.retrieve_meta_storage = retrieve_meta_storage

	def build_meta_storage(self) -> TransactionalStorageSPI:
		"""
		build a new meta storage instance
		"""
		return self.retrieve_meta_storage()

	def init_snowflake(self, snowflake_generator: SnowflakeGenerator):
		self.snowflake_generator = snowflake_generator

	def get_snowflake_generator(self):
		return self.snowflake_generator

	def init_authentication(self, authentication_manager: AuthenticationManager):
		self.authentication_manager = authentication_manager


surface = ReactorSurface()


def ask_meta_storage() -> TransactionalStorageSPI:
	return surface.build_meta_storage()


def ask_snowflake_generator() -> SnowflakeGenerator:
	return surface.get_snowflake_generator()
