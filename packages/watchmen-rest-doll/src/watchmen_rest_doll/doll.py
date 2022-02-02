from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_model.admin import User
from watchmen_rest import RestApp
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .settings import DollSettings
from .util import build_find_user_by_name, build_find_user_by_pat


class DollApp(RestApp):
	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		meta_storage = self.build_meta_storage()
		meta_storage.begin()
		try:
			return build_find_user_by_name(meta_storage)
		finally:
			meta_storage.close()

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		meta_storage = self.build_meta_storage()
		meta_storage.begin()
		try:
			return build_find_user_by_pat(meta_storage)
		finally:
			meta_storage.close()

	def init_kafka_connector(self) -> None:
		pass

	def init_rabbitmq_connector(self) -> None:
		pass

	def post_construct(self, app: FastAPI) -> None:
		self.init_kafka_connector()
		self.init_rabbitmq_connector()


doll = DollApp(DollSettings())


def ask_meta_storage() -> TransactionalStorageSPI:
	return doll.build_meta_storage()


def ask_snowflake_generator() -> SnowflakeGenerator:
	return doll.get_snowflake_generator()


def ask_jwt_params() -> Tuple[str, str]:
	return doll.get_jwt_params()


def ask_access_token_expires_in() -> int:
	return doll.get_access_token_expires_in()
