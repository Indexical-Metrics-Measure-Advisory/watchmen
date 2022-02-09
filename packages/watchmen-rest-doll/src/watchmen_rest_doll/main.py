from watchmen_reactor_surface import get_surface_routers as get_reactor_routers
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from .admin import enumeration_router, pipeline_graphic_router, pipeline_router, space_router, topic_router, \
	user_group_router, user_router
from .auth import authenticate_router
from .console import connected_space_graphic_router, connected_space_router, dashboard_router, report_router, \
	subject_router
from .doll import doll
from .gui import favorite_router, last_snapshot_router
from .meta_import import dashboard_import_router, report_import_router, subject_import_router, \
	user_group_import_router, user_import_router
from .system import data_source_router, external_writer_router, pat_router, tenant_router

app = doll.construct()


@app.on_event("startup")
def startup():
	doll.on_startup(app)


ArrayHelper([
	# system
	health_router.router,
	authenticate_router.router, pat_router.router,
	tenant_router.router, data_source_router.router, external_writer_router.router,
	# admin
	user_router.router, user_group_router.router,
	enumeration_router.router,
	topic_router.router, pipeline_router.router, pipeline_graphic_router.router,
	space_router.router,
	# console
	connected_space_router.router, connected_space_graphic_router.router,
	subject_router.router, report_router.router,
	dashboard_router.router,
	# gui
	favorite_router.router, last_snapshot_router.router,
	# meta import
	user_import_router.router, user_group_import_router.router,
	subject_import_router.router, report_import_router.router,
	dashboard_import_router.router,
]).each(lambda x: app.include_router(x))

ArrayHelper(get_reactor_routers()).each(lambda x: app.include_router(x))
