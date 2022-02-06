from watchmen_rest.system import health_router
from .admin import enumeration_router, pipeline_graphic_router, pipeline_router, space_router, topic_router, \
	user_group_router, user_router
from .auth import authenticate_router
from .console import connected_space_graphic_router, connected_space_router, dashboard_router, report_router, \
	subject_router
from .doll import doll
from .gui import favorite_router, last_snapshot_router
from .system import data_source_router, external_writer_router, pat_router, tenant_router

app = doll.construct()


@app.on_event("startup")
def startup():
	doll.on_startup(app)


app.include_router(health_router.router)

app.include_router(authenticate_router.router)
app.include_router(pat_router.router)
app.include_router(tenant_router.router)
app.include_router(data_source_router.router)
app.include_router(external_writer_router.router)

app.include_router(user_router.router)
app.include_router(user_group_router.router)
app.include_router(space_router.router)
app.include_router(enumeration_router.router)
app.include_router(topic_router.router)
app.include_router(pipeline_router.router)
app.include_router(pipeline_graphic_router.router)

app.include_router(connected_space_router.router)
app.include_router(connected_space_graphic_router.router)
app.include_router(subject_router.router)
app.include_router(report_router.router)
app.include_router(dashboard_router.router)

app.include_router(favorite_router.router)
app.include_router(last_snapshot_router.router)
