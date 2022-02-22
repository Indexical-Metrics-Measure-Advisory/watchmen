from typing import List, Optional

from starlette.requests import Request

from watchmen_auth import AuthenticationManager, AuthFailOn401, AuthFailOn403, PrincipalService
from watchmen_model.admin import UserRole
from .authentication import get_admin_principal_by, get_any_admin_principal_by, get_any_principal_by, \
	get_console_principal_by, get_principal_by_jwt as by_jwt, get_principal_by_pat as by_pat, \
	get_super_admin_principal_by
from .util import raise_401, raise_403


# singleton
class AuthenticationManagerWrapper:
	authenticationManager: Optional[AuthenticationManager] = None


WRAPPER = AuthenticationManagerWrapper()


def register_authentication_manager(authentication_manager: AuthenticationManager) -> None:
	WRAPPER.authenticationManager = authentication_manager


def retrieve_authentication_manager() -> Optional[AuthenticationManager]:
	return WRAPPER.authenticationManager


def get_principal_by_jwt(token: str, roles: List[UserRole]) -> PrincipalService:
	try:
		return by_jwt(WRAPPER.authenticationManager, token, roles)
	except AuthFailOn401:
		raise_401('Unauthorized visit.')
	except AuthFailOn403:
		raise_403()


def get_principal_by_pat(token: str, roles: List[UserRole]) -> PrincipalService:
	try:
		return by_pat(WRAPPER.authenticationManager, token, roles)
	except AuthFailOn401:
		raise_401('Unauthorized visit.')
	except AuthFailOn403:
		raise_403()


def get_super_admin_principal(request: Request) -> PrincipalService:
	return get_super_admin_principal_by(WRAPPER.authenticationManager)(request)


def get_any_admin_principal(request: Request) -> PrincipalService:
	return get_any_admin_principal_by(WRAPPER.authenticationManager)(request)


def get_admin_principal(request: Request) -> PrincipalService:
	return get_admin_principal_by(WRAPPER.authenticationManager)(request)


def get_console_principal(request: Request) -> PrincipalService:
	return get_console_principal_by(WRAPPER.authenticationManager)(request)


def get_any_principal(request: Request) -> PrincipalService:
	return get_any_principal_by(WRAPPER.authenticationManager)(request)
