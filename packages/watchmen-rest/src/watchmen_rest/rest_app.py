from __future__ import annotations

from abc import abstractmethod
from logging import getLogger
from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_auth import AuthenticationManager
from watchmen_model.admin import User
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .authentication import build_authentication_manager
from .cors import install_cors
from .meta_storage import build_meta_storage
from .prometheus import install_prometheus
from .rest_settings import RestSettings
from .snowflake import build_snowflake_generator

logger = getLogger(f'app.{__name__}')


class RestApp:
	retrieve_meta_storage: Callable[[], TransactionalStorageSPI]
	snowflake_generator: SnowflakeGenerator
	authentication_manager: AuthenticationManager

	def __init__(self, settings: RestSettings):
		self.settings = settings

	def get_settings(self) -> RestSettings:
		return self.settings

	def construct(self) -> FastAPI:
		app = FastAPI(
			title=self.settings.APP_NAME,
			version=self.settings.VERSION,
			description=self.settings.DESCRIPTION
		)
		self.init_cors(app)
		self.init_prometheus(app)

		self.init_meta_storage()
		self.init_snowflake()

		self.init_authentication()

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

	def build_meta_storage(self) -> TransactionalStorageSPI:
		"""
		build a new meta storage instance
		"""
		return self.retrieve_meta_storage()

	def init_meta_storage(self) -> None:
		"""
		initialize a meta storage builder
		"""
		self.retrieve_meta_storage = build_meta_storage(self.settings)

	def get_snowflake_generator(self):
		return self.snowflake_generator

	def init_snowflake(self) -> None:
		# snowflake use another storage,
		# since there might be a heart beat, cannot share storage api
		self.snowflake_generator = build_snowflake_generator(self.build_meta_storage(), self.settings)

	def init_authentication(self) -> None:
		self.authentication_manager = build_authentication_manager(
			self.settings, self.build_find_user_by_name(), self.build_find_user_by_pat()
		)

	def get_jwt_params(self) -> Tuple[str, str]:
		"""
		Tuple(secret_key, algorithm)
		"""
		return self.settings.JWT_SECRET_KEY, self.settings.JWT_ALGORITHM

	def get_access_token_expires_in(self) -> int:
		"""
		in minutes
		"""
		return self.settings.ACCESS_TOKEN_EXPIRE_MINUTES

	@abstractmethod
	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		pass

	@abstractmethod
	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		pass

	@abstractmethod
	def post_construct(self, app: FastAPI) -> None:
		pass
