from fastapi import FastAPI

from watchmen_rest import RestApp
from watchmen_rest_doll.settings import DollSettings


class DollApp(RestApp):
	def post_construct(self, app: FastAPI) -> FastAPI:
		pass


settings = DollSettings()
doll = DollApp(settings).construct()
