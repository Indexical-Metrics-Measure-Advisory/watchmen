from watchmen_metricflow.app import metric_flow_app
from watchmen_metricflow.router import metric_meta_router, semantic_meta_router, metric_router, data_profile_router, topic_router

from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

app = metric_flow_app.construct()


@app.on_event("startup")
def startup():
    metric_flow_app.on_startup(app)


ArrayHelper([
    health_router.router,
    # document_router.router,
    # data_story_router.router,
    metric_meta_router.router,
    semantic_meta_router.router,
    metric_router.router,
    data_profile_router.router,
    topic_router.router


    # chat_router.router,
    # objective_chat_router.router,
    # teams_router.router
]).each(lambda x: app.include_router(x))


