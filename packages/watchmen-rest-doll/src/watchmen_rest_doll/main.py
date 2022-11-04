from watchmen_data_surface import get_data_surface_routers
from watchmen_indicator_surface import get_indicator_surface_routers
from watchmen_inquiry_surface import get_inquiry_surface_routers
from watchmen_pipeline_surface import get_pipeline_surface_routers
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from .admin import enumeration_router, pipeline_graphic_router, pipeline_router, space_router, synonym_topic_router, \
	topic_router, topic_snapshot_scheduler_router, user_group_router, user_router
from .analysis import pipeline_index_router, topic_index_router
from .auth import authenticate_router
from .console import connected_space_graphic_router, connected_space_router, dashboard_router, report_router, \
	subject_router
from .doll import doll
from .gui import favorite_router, last_snapshot_router
from .meta_import import connected_space_import_router, dashboard_import_router, mix_import_router, \
	pipeline_import_router, report_import_router, space_import_router, subject_import_router, topic_import_router, \
	user_group_import_router, user_import_router
from .sso.sso_router import install_sso_router
from .system import data_source_router, external_writer_router, pat_router, plugin_router, tenant_init_router, \
	tenant_router, operation_router, package_version_router


app = doll.construct()


@app.on_event("startup")
def startup():
	doll.on_startup(app)


ArrayHelper([
	# system
	health_router.router,
	authenticate_router.router, pat_router.router, operation_router.router, package_version_router.router,
	tenant_router.router, data_source_router.router, external_writer_router.router, plugin_router.router,
	tenant_init_router.router,
	# admin
	user_router.router, user_group_router.router,
	enumeration_router.router,
	topic_router.router, synonym_topic_router.router, pipeline_router.router, pipeline_graphic_router.router,
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
	# analysis
	topic_index_router.router, pipeline_index_router.router
]).each(lambda x: app.include_router(x))

install_sso_router(app)

ArrayHelper(get_data_surface_routers()).each(lambda x: app.include_router(x))
ArrayHelper(get_pipeline_surface_routers()).each(lambda x: app.include_router(x))
ArrayHelper(get_inquiry_surface_routers()).each(lambda x: app.include_router(x))
ArrayHelper(get_indicator_surface_routers()).each(lambda x: app.include_router(x))
