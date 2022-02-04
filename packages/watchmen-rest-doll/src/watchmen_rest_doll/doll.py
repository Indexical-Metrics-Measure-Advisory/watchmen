from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_model.admin import User
from watchmen_rest import RestApp
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .connectors import init_kafka, init_rabbitmq
from .settings import DollSettings
from .util import build_find_user_by_name, build_find_user_by_pat


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

	def is_tuple_delete_enabled(self):
		return self.get_settings().TUPLE_DELETABLE

	def is_engine_cache_enabled(self):
		return self.get_settings().ENGINE_CACHE

	def is_engine_index_enabled(self):
		return self.get_settings().ENGINE_INDEX

	def is_presto_enabled(self):
		return self.get_settings().PRESTO

	def is_kafka_connector_enabled(self):
		return self.get_settings().KAFKA_CONNECTOR

	def init_kafka_connector(self):
		if self.is_kafka_connector_enabled():
			init_kafka()

	def is_rabbitmq_connector_enabled(self):
		return self.get_settings().RABBITMQ_CONNECTOR

	def init_rabbitmq_connector(self):
		if self.is_rabbitmq_connector_enabled():
			init_rabbitmq()

	def init_connectors(self):
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
