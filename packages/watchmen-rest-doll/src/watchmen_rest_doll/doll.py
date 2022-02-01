from typing import Callable, Optional

from fastapi import FastAPI

from watchmen_model.admin import User
from watchmen_rest import RestApp
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .settings import DollSettings
from .util import build_find_user_by_name


class DollApp(RestApp):
	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		self.meta_storage.begin()
		try:
			return build_find_user_by_name(self.meta_storage)
		finally:
			self.meta_storage.close()

	def init_kafka_connector(self) -> None:
		pass

	def init_rabbitmq_connector(self) -> None:
		pass

	def post_construct(self, app: FastAPI) -> None:
		self.init_kafka_connector()
		self.init_rabbitmq_connector()


doll = DollApp(DollSettings())


def ask_meta_storage() -> TransactionalStorageSPI:
	return doll.meta_storage


def ask_snowflake_generator() -> SnowflakeGenerator:
	return doll.snowflake_generator
