from __future__ import annotations

from abc import abstractmethod
from logging import getLogger

from fastapi import FastAPI

from watchmen_auth import AuthenticationManager
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .authentication import build_authentication_manager
from .cors import install_cors
from .meta_storage import build_meta_storage
from .prometheus import install_prometheus
from .rest_settings import RestSettings
from .snowflake import build_snowflake_generator

logger = getLogger(f'app.{__name__}')


class RestApp:
	meta_storage: TransactionalStorageSPI
	snowflake_generator: SnowflakeGenerator
	authentication_manager: AuthenticationManager

	def __init__(self, settings: RestSettings):
		self.settings = settings

	def construct(self) -> FastAPI:
		app = FastAPI(
			title=self.settings.TITLE,
			version=self.settings.VERSION,
			description=self.settings.DESCRIPTION
		)
		self.init_cors(app)
		self.init_prometheus(app)

		self.init_meta_storage()
		self.init_snowflake()

		self.post_construct(app)
		logger.info('REST app constructed.')
		return app

	def is_cors_on(self) -> bool:
		return self.settings.CORS

	def init_cors(self, app: FastAPI) -> None:
		if self.is_cors_on():
			install_cors(app, self.settings)

	def is_prometheus_on(self) -> bool:
		return self.settings.PROMETHEUS

	def init_prometheus(self, app: FastAPI) -> None:
		if self.is_prometheus_on():
			install_prometheus(app, self.settings)

	def init_meta_storage(self) -> None:
		self.meta_storage = build_meta_storage(self.settings)

	def init_snowflake(self) -> None:
		self.snowflake_generator = build_snowflake_generator(self.meta_storage, self.settings)

	def init_authentication(self) -> None:
		self.authentication_manager = build_authentication_manager(self.meta_storage, self.settings)

	@abstractmethod
	def post_construct(self, app: FastAPI) -> None:
		pass
