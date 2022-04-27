from fastapi import FastAPI

from watchmen_rest.settings import RestSettings
from watchmen_rest_doll.sso.saml import auth_saml_router


def install_saml(app: FastAPI) -> None:
	app.include_router(auth_saml_router.router)
