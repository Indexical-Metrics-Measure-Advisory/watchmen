from __future__ import annotations

from logging import getLogger

from fastapi import FastAPI

from .cors import install_cors
from .prometheus import install_prometheus
from .rest_settings import RestSettings

logger = getLogger(f"app.{__name__}")


class RestApp:
	def __init__(self, settings: RestSettings):
		self.settings = settings

	def construct(self) -> FastAPI:
		app = FastAPI(
			title=self.settings.TITLE,
			version=self.settings.VERSION,
			description=self.settings.DESCRIPTION
		)

		self.settings.post_construct(app)
		logger.info('REST app constructed.')
		return app

	def is_cors_on(self) -> bool:
		return self.settings.CORS

	def init_cors(self, app: FastAPI) -> None:
		if self.is_cors_on():
			install_cors(app)

	def is_prometheus_on(self) -> bool:
		return self.settings.PROMETHEUS

	def init_prometheus(self, app: FastAPI) -> None:
		if self.is_prometheus_on():
			install_prometheus(app)
