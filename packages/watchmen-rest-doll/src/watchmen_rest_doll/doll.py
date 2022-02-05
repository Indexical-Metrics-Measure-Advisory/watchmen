from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_meta_service.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_rest import RestApp
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .connectors import init_kafka, init_rabbitmq, KafkaSettings, RabbitmqSettings
from .settings import DollSettings
from .util import is_blank


class DollApp(RestApp):
	def get_settings(self) -> DollSettings:
		# noinspection PyTypeChecker
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_name(self.build_meta_storage())

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_pat(self.build_meta_storage())

	def is_tuple_delete_enabled(self) -> bool:
		return self.get_settings().TUPLE_DELETABLE

	def is_engine_cache_enabled(self) -> bool:
		return self.get_settings().ENGINE_CACHE

	def is_engine_index_enabled(self) -> bool:
		return self.get_settings().ENGINE_INDEX

	def is_presto_enabled(self) -> bool:
		return self.get_settings().PRESTO

	def is_kafka_connector_enabled(self) -> bool:
		return self.get_settings().KAFKA_CONNECTOR

	def get_kafka_connector_settings(self) -> KafkaSettings:
		settings = self.get_settings()
		topics = settings.KAFKA_TOPICS
		if is_blank(topics):
			topics = []
		else:
			topics = topics.split(',')
		return KafkaSettings(
			bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVER,
			topics=topics
		)

	def init_kafka_connector(self) -> None:
		if self.is_kafka_connector_enabled():
			init_kafka(self.get_kafka_connector_settings())

	def is_rabbitmq_connector_enabled(self) -> bool:
		return self.get_settings().RABBITMQ_CONNECTOR

	def get_rabbitmq_connector_settings(self) -> RabbitmqSettings:
		settings = self.get_settings()
		return RabbitmqSettings(
			host=settings.RABBITMQ_HOST,
			port=settings.RABBITMQ_PORT,
			virtual_host=settings.RABBITMQ_VIRTUALHOST,
			username=settings.RABBITMQ_USERNAME,
			password=settings.RABBITMQ_PASSWORD,
			queue=settings.RABBITMQ_QUEUE,
			durable=settings.RABBITMQ_DURABLE,
			auto_delete=settings.RABBITMQ_AUTO_DELETE
		)

	def init_rabbitmq_connector(self) -> None:
		if self.is_rabbitmq_connector_enabled():
			init_rabbitmq(self.get_rabbitmq_connector_settings())

	def init_connectors(self) -> None:
		self.init_kafka_connector()
		self.init_rabbitmq_connector()

	def post_construct(self, app: FastAPI) -> None:
		pass

	def on_startup(self, app: FastAPI) -> None:
		self.init_connectors()


doll = DollApp(DollSettings())


def ask_meta_storage() -> TransactionalStorageSPI:
	return doll.build_meta_storage()


def ask_snowflake_generator() -> SnowflakeGenerator:
	return doll.get_snowflake_generator()


def ask_jwt_params() -> Tuple[str, str]:
	return doll.get_jwt_params()


def ask_access_token_expires_in() -> int:
	return doll.get_access_token_expires_in()


def ask_tuple_delete_enabled() -> bool:
	return doll.is_tuple_delete_enabled()


def ask_engine_cache_enabled() -> bool:
	return doll.is_engine_cache_enabled()


def ask_engine_index_enabled() -> bool:
	return doll.is_engine_index_enabled()


def ask_presto_enabled() -> bool:
	return doll.is_presto_enabled()
