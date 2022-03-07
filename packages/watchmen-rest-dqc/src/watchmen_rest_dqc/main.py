from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from .admin import catalog_router, monitor_rules_router
from .dqc import dqc
from .monitor import topic_monitor_router
from .topic_profile import topic_profile_router

app = dqc.construct()


@app.on_event("startup")
def startup():
	dqc.on_startup(app)


ArrayHelper([
	# system
	health_router.router,
	catalog_router.router, monitor_rules_router.router,
	topic_monitor_router.router, topic_profile_router.router
]).each(lambda x: app.include_router(x))
