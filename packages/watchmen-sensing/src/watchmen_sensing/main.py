from typing import Callable, Optional

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from logging import getLogger

from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_rest import RestApp
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

from watchmen_sensing.agent.base import configure_llm_env
from watchmen_sensing.boot import init_sensing_jobs
from watchmen_sensing.router import (
	action_router, context_router, schema_router, sensing_router, sensor_router, signal_router
)
from watchmen_sensing.settings import SensingSettings, sensing_settings

logger = getLogger('watchmen_sensing.main')


def get_sensing_routers():
	"""Factory used by watchmen-rest-doll (and the standalone app) to mount the
	sensing routers. Returns the list of FastAPI APIRouters."""
	return [
		signal_router.router,
		sensor_router.router,
		context_router.router,
		sensing_router.router,
		action_router.router,
		schema_router.router,
	]


class SensingApp(RestApp):
	def get_settings(self) -> SensingSettings:
		# noinspection PyTypeChecker
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		return build_find_user_by_name()

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		return build_find_user_by_pat()

	def post_construct(self, app: FastAPI) -> None:
		pass

	def on_startup(self, app: FastAPI) -> None:
		configure_llm_env()
		# Periodic sensing is opt-in via SENSING_SCHEDULER_ENABLED and needs a
		# host-supplied principal provider; the standalone app leaves it off.
		init_sensing_jobs()


sensing_app = SensingApp(sensing_settings)
app = sensing_app.construct()


@app.on_event('startup')
def startup():
	sensing_app.on_startup(app)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
	logger.error('Validation error: %s', exc.errors())
	return JSONResponse(status_code=400, content=jsonable_encoder({'detail': exc.errors()}))


ArrayHelper([
	health_router.router,
]).each(lambda x: app.include_router(x))

ArrayHelper(get_sensing_routers()).each(lambda x: app.include_router(x))
