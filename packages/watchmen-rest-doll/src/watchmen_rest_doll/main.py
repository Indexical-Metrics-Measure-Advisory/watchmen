from .admin import user
from .auth import authenticator
from .doll import doll

app = doll.construct()

app.include_router(authenticator.router)
app.include_router(user.router)
