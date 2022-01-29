from __future__ import annotations

from logging import getLogger

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .rest_configuration import RestConfiguration

logger = getLogger("app." + __name__)


class RestApp:
	def __init__(self, configuration: RestConfiguration):
		self.configuration = configuration

	def construct(self) -> FastAPI:
		app = FastAPI(
			title=self.configuration.title,
			version=self.configuration.version,
			description=self.configuration.description
		)
		if self.configuration.cors:
			app.add_middleware(
				CORSMiddleware,
				allow_origins=['*'],
				allow_credentials=True,
				allow_methods=["*"],
				allow_headers=["*"],
			)
		self.configuration.post_construct(app)
		return app
