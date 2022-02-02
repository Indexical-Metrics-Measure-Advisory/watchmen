from .admin import user
from .auth import authenticator
from .doll import doll
from .system import data_source, external_writer, pat, tenant

app = doll.construct()

app.include_router(authenticator.router)
app.include_router(pat.router)
app.include_router(tenant.router)
app.include_router(data_source.router)
app.include_router(external_writer.router)
app.include_router(user.router)
