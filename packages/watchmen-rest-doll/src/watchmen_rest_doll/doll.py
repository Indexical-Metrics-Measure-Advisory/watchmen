from fastapi import FastAPI

from watchmen_rest import RestApp
from .settings import DollSettings


class DollApp(RestApp):
	def post_construct(self, app: FastAPI) -> FastAPI:
		pass


def build_doll() -> DollApp:
	return DollApp(DollSettings())
