from typing import Callable, Optional

from fastapi import FastAPI

from watchmen_model.admin import User
from watchmen_rest import RestApp
from .settings import DollSettings
from .system import build_find_user_by_name


class DollApp(RestApp):
	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		return build_find_user_by_name(self.meta_storage)

	def init_kafka_connector(self) -> None:
		pass

	def init_rabbitmq_connector(self) -> None:
		pass

	def post_construct(self, app: FastAPI) -> None:
		self.init_kafka_connector()
		self.init_rabbitmq_connector()


doll = DollApp(DollSettings())
