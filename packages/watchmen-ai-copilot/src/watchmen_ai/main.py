from watchmen_ai.ai_server import ai_app
from watchmen_ai.router import ai_router
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

app = ai_app.construct()


@app.on_event("startup")
def startup():
	ai_app.on_startup(app)


ArrayHelper([
	# system
	health_router.router,
	ai_router.router

]).each(lambda x: app.include_router(x))
