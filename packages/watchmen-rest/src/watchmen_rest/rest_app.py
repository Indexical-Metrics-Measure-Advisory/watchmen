from __future__ import annotations

from abc import abstractmethod
from logging import getLogger
from typing import Callable, List, Optional, Tuple

from fastapi import FastAPI

from watchmen_auth import AuthenticationProvider
from watchmen_model.admin import User
from .auth_helper import register_authentication_manager
from .authentication import build_authentication_manager
from .cors import install_cors
from .prometheus import install_prometheus
from .settings import RestSettings

logger = getLogger(f'app.{__name__}')


class RestApp:
	def __init__(self, settings: RestSettings):
		self.settings = settings
		logger.info(f'Application settings[{settings.dict()}].')

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

	# noinspection PyMethodMayBeStatic
	def get_authentication_providers(self) -> List[AuthenticationProvider]:
		"""
		default return empty list, override me and return your authentication providers here.
		"""
		return []

	def init_authentication(self) -> None:
		register_authentication_manager(build_authentication_manager(
			self.settings, self.build_find_user_by_name(), self.build_find_user_by_pat(),
			self.get_authentication_providers()
		))

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

	@abstractmethod
	def on_startup(self, app: FastAPI) -> None:
		pass
