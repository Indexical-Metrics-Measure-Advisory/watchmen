from .admin import user
from .auth import authenticator
from .doll import doll
from .system import pat

app = doll.construct()

app.include_router(authenticator.router)
app.include_router(pat.router)
app.include_router(user.router)
