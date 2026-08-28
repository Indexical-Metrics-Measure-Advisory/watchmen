from fastapi import APIRouter, Depends

from watchmen_collector_surface.main import get_batch_collector_surface_routers
from watchmen_data_surface import get_data_surface_routers
from watchmen_indicator_surface import get_indicator_surface_routers
from watchmen_inquiry_surface import get_inquiry_surface_routers
from watchmen_lineage.router import lineage_router
from watchmen_pipeline_surface import get_pipeline_surface_routers
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from .admin import enumeration_router, pipeline_agent_router, pipeline_graphic_router, pipeline_router, \
	pipeline_yaml_router, space_router, synonym_topic_router, tag_router, \
	topic_agent_router, topic_router, topic_snapshot_scheduler_router, topic_yaml_router, user_group_router, user_router
from .analysis import pipeline_index_router, topic_index_router
from .audit import audit_recorder, audit_router
from .auth import authenticate_router
from .console import connected_space_graphic_router, connected_space_router, dashboard_router, report_router, \
	subject_router
from .doll import doll
from .gui import favorite_router, last_snapshot_router
from .ingest import config_router, monitor_router
from .meta_import import connected_space_import_router, dashboard_import_router, mix_import_router, \
	pipeline_import_router, report_import_router, space_import_router, subject_import_router, topic_import_router, \
	user_group_import_router, user_import_router
from .sso.sso_router import install_sso_router
from .system import ai_model_router, data_source_router, external_writer_router, kafka_collector_config_router, \
	pat_router, plugin_router, tenant_init_router, tenant_router, operation_router, package_version_router, \
	system_router
from .webhook import webhook_router


app = doll.construct()


@app.on_event("startup")
def startup():
	doll.on_startup(app)


# routers whose requests are not audited by the generic recorder:
# health is infrastructure, authentication is audited explicitly on login,
# the audit api itself would only add audit-of-audit noise
AUDIT_EXCLUDED_ROUTERS = (health_router.router, authenticate_router.router, audit_router.router)


def attach_audit_recorder(router: APIRouter) -> None:
	# idempotent: routers are module level singletons
	if any(getattr(x, 'dependency', None) is audit_recorder for x in router.dependencies):
		return
	router.dependencies.append(Depends(audit_recorder))


def ask_audited(router: APIRouter) -> APIRouter:
	if doll.ask_audit_enabled() and router not in AUDIT_EXCLUDED_ROUTERS:
		attach_audit_recorder(router)
	return router


ArrayHelper([
	# system
	health_router.router,
	authenticate_router.router, pat_router.router, operation_router.router, package_version_router.router,
	tenant_router.router, ai_model_router.router, data_source_router.router, external_writer_router.router, plugin_router.router,
	tenant_init_router.router, system_router.router, kafka_collector_config_router.router,
	# admin
	user_router.router, user_group_router.router,
	enumeration_router.router, tag_router.router,
	topic_router.router, topic_yaml_router.router, topic_agent_router.router, synonym_topic_router.router, pipeline_router.router, pipeline_yaml_router.router, pipeline_agent_router.router, pipeline_graphic_router.router,
	space_router.router,
	topic_snapshot_scheduler_router.router,
	# console
	connected_space_router.router, connected_space_graphic_router.router,
	subject_router.router, report_router.router,
	dashboard_router.router,
	# gui
	favorite_router.router, last_snapshot_router.router,
	# meta import
	user_import_router.router, user_group_import_router.router,
	space_import_router.router, topic_import_router.router, pipeline_import_router.router,
	connected_space_import_router.router, subject_import_router.router, report_import_router.router,
	dashboard_import_router.router,
	mix_import_router.router,
	webhook_router.router,
	config_router.router,
	# analysis
	topic_index_router.router, pipeline_index_router.router,
	# collector monitor
	monitor_router.router,
	# audit
	audit_router.router,

]).each(lambda x: app.include_router(ask_audited(x)))

install_sso_router(app)

ArrayHelper(get_data_surface_routers()).each(lambda x: app.include_router(ask_audited(x)))
ArrayHelper(get_pipeline_surface_routers()).each(lambda x: app.include_router(ask_audited(x)))
ArrayHelper(get_inquiry_surface_routers()).each(lambda x: app.include_router(ask_audited(x)))
ArrayHelper(get_indicator_surface_routers()).each(lambda x: app.include_router(ask_audited(x)))

app.include_router(lineage_router.router)

if doll.ask_collector_enabled():
	from watchmen_collector_surface import get_collector_surface_routers
	ArrayHelper(get_collector_surface_routers()).each(lambda x: app.include_router(x))

ArrayHelper(get_batch_collector_surface_routers()).each(lambda x: app.include_router(x))
