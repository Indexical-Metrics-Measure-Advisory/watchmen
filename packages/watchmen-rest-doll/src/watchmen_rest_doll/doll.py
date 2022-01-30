from fastapi import FastAPI

from watchmen_rest import RestApp
from .auth import build_authentication_manager
from .settings import DollSettings


class DollApp(RestApp):
	def init_authentication(self) -> None:
		self.authentication_manager = build_authentication_manager(self.meta_storage, self.settings)

	def init_kafka_connector(self) -> None:
		pass

	def init_rabbitmq_connector(self) -> None:
		pass

	def post_construct(self, app: FastAPI) -> None:
		self.init_authentication()
		self.init_kafka_connector()
		self.init_rabbitmq_connector()


settings = DollSettings()
doll = DollApp(settings)
