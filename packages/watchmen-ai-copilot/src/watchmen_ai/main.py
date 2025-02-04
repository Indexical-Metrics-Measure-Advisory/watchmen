from watchmen_ai.ai_server import ai_app
from watchmen_ai.router import ai_router, data_story_router, data_insight_router
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

app = ai_app.construct()


@app.on_event("startup")
def startup():
    ai_app.on_startup(app)


ArrayHelper([
    health_router.router,
    # document_router.router,
    data_story_router.router,
    ai_router.router,
    data_insight_router.router,
    # chat_router.router,
    # objective_chat_router.router,
    # teams_router.router
]).each(lambda x: app.include_router(x))
