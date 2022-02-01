from .admin import user
from .doll import doll
from .system import auth

app = doll.construct()

app.include_router(auth.router)
app.include_router(user.router)
