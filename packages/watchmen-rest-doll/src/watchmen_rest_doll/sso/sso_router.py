from fastapi import FastAPI

from watchmen_rest_doll.doll import ask_saml2_enabled


def install_sso_router(app: FastAPI) -> None:
	if ask_saml2_enabled():
		from .saml import auth_saml_router
		app.include_router(auth_saml_router.router)
