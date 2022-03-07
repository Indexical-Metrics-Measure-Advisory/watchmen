from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from .dqc import dqc

app = dqc.construct()


@app.on_event("startup")
def startup():
	dqc.on_startup(app)


ArrayHelper([
	# system
	health_router.router,
]).each(lambda x: app.include_router(x))
