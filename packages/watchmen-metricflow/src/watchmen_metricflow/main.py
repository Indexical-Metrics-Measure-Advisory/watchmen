from fastapi import FastAPI
from fastapi_mcp import FastApiMCP

from watchmen_metricflow.app import metric_flow_app
from watchmen_metricflow.router import metric_meta_router, semantic_meta_router, metric_router, data_profile_router, \
    topic_router, metric_category_router, bi_analysis_router, alert_rule_router, suggest_action_router, \
    metric_subscription_router, metric_lineage_router, business_glossary_router, ontology_router
import watchmen_metricflow.ontology.router as ontology_data_router
from watchmen_metricflow.settings import ask_mcp_flag

from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper

app:FastAPI = metric_flow_app.construct()


@app.on_event("startup")
def startup():
    metric_flow_app.on_startup(app)

    # Import glossary seed data if table is empty
    try:
        from watchmen_metricflow.data.glossary_seed_import import import_glossary_seed_data
        import_glossary_seed_data()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Glossary seed import failed during startup: {e}")

    if ask_mcp_flag():
        mcp = FastApiMCP(
            app,
            include_tags=["mcp"],
            description = "mcp services for insurance metrics analysis",
            describe_all_responses = True,
            describe_full_response_schema = True
        )

        mcp.mount_http()




ArrayHelper([
    health_router.router,
    metric_meta_router.router,
    semantic_meta_router.router,
    metric_router.router,
    data_profile_router.router,
    topic_router.router,
    metric_category_router.router,
    bi_analysis_router.router,
    alert_rule_router.router,
    suggest_action_router.router,
    metric_subscription_router.router,
    metric_lineage_router.router,
    business_glossary_router.router,
    ontology_router.router,
    ontology_data_router.router


]).each(lambda x: app.include_router(x))

