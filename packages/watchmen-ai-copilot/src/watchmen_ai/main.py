from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

from watchmen_ai.ai_server import ai_app
from watchmen_ai.hypothesis.router import hypothesis_business_router, metrics_router, agent_router, \
    agent_managment_router, analysis_router, analysis_report_router, ai_chat_router
from watchmen_ai.mcp.router import topic_mcp_router, pipeline_mcp_router

from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

app = ai_app.construct()

logger = logging.getLogger("watchmen_ai.main")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    try:
        body = await request.body()
        logger.error(f"Request body: {body.decode()}")
    except Exception as e:
        logger.error(f"Failed to read body: {e}")
        
    return JSONResponse(
        status_code=400,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )


@app.on_event("startup")
def startup():
    ai_app.on_startup(app)


ArrayHelper([
    health_router.router,
    ai_chat_router.router,
    # ai_router.router,
    hypothesis_business_router.router,
    metrics_router.router,
    agent_router.router,
    agent_managment_router.router,
    analysis_router.router,
    analysis_report_router.router,
    topic_mcp_router.router,
    pipeline_mcp_router.router

    # chat_router.router,
    # objective_chat_router.router,
    # teams_router.router
]).each(lambda x: app.include_router(x))
