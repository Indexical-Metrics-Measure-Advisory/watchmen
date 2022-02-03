from .admin import enumeration, space, topic, user, user_group
from .auth import authenticator
from .doll import doll
from .gui import favorite, last_snapshot
from .system import data_source, external_writer, pat, tenant

app = doll.construct()


@app.on_event("startup")
def startup():
	doll.on_startup(app)


app.include_router(authenticator.router)
app.include_router(pat.router)
app.include_router(tenant.router)
app.include_router(data_source.router)
app.include_router(external_writer.router)

app.include_router(user.router)
app.include_router(user_group.router)
app.include_router(space.router)
app.include_router(enumeration.router)
app.include_router(topic.router)

app.include_router(favorite.router)
app.include_router(last_snapshot.router)
