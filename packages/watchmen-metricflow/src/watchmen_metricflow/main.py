from fastapi import FastAPI
from fastapi_mcp import FastApiMCP

from watchmen_metricflow.app import metric_flow_app
from watchmen_metricflow.router import metric_meta_router, semantic_meta_router, metric_router, data_profile_router, topic_router
from watchmen_metricflow.settings import ask_mcp_flag

from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

app:FastAPI = metric_flow_app.construct()


@app.on_event("startup")
def startup():
    metric_flow_app.on_startup(app)

    if ask_mcp_flag():
        mcp = FastApiMCP(
            app,
            include_tags=["mcp"]
        )

        mcp.mount_http()




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


