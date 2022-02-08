from typing import List

from starlette.requests import Request

from watchmen_auth import AuthFailOn401, AuthFailOn403, PrincipalService
from watchmen_model.admin import UserRole
from watchmen_rest import get_admin_principal_by, get_any_admin_principal_by, get_any_principal_by, \
	get_console_principal_by, get_principal_by_jwt as by_jwt, get_principal_by_pat as by_pat, \
	get_super_admin_principal_by
from watchmen_rest.util import raise_401, raise_403
from watchmen_rest_doll.doll import doll


def get_principal_by_jwt(token: str, roles: List[UserRole]) -> PrincipalService:
	try:
		return by_jwt(doll.authentication_manager, token, roles)
	except AuthFailOn401:
		raise_401('Unauthorized visit.')
	except AuthFailOn403:
		raise_403()


def get_principal_by_pat(token: str, roles: List[UserRole]) -> PrincipalService:
	try:
		return by_pat(doll.authentication_manager, token, roles)
	except AuthFailOn401:
		raise_401('Unauthorized visit.')
	except AuthFailOn403:
		raise_403()


def get_super_admin_principal(request: Request) -> PrincipalService:
	return get_super_admin_principal_by(doll.authentication_manager)(request)


def get_any_admin_principal(request: Request) -> PrincipalService:
	return get_any_admin_principal_by(doll.authentication_manager)(request)


def get_admin_principal(request: Request) -> PrincipalService:
	return get_admin_principal_by(doll.authentication_manager)(request)


def get_console_principal(request: Request) -> PrincipalService:
	return get_console_principal_by(doll.authentication_manager)(request)


def get_any_principal(request: Request) -> PrincipalService:
	return get_any_principal_by(doll.authentication_manager)(request)
