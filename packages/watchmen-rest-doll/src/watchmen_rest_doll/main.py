from .admin import user
from .doll import doll
from .system import login

app = doll.construct()

app.include_router(login.router)
app.include_router(user.router)
