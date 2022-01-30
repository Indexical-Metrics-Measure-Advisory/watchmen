from .admin import user
from .doll import doll

app = doll.construct()

app.include_router(user.router)
