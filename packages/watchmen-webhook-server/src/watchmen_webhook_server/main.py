from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from watchmen_webhook_server.router import webhook_server_router
from watchmen_webhook_server.webhook import webhook

app = webhook.construct()


@app.on_event("startup")
def startup():
	webhook.on_startup(app)


ArrayHelper([
	# system
	health_router.router,
	webhook_server_router.router

]).each(lambda x: app.include_router(x))
