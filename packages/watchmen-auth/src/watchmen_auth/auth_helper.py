from typing import Callable, List

from watchmen_model.admin import UserRole
from .authentication import AuthenticationManager
from .authorization import AuthFailOn401, Authorization
from .principal_service import PrincipalService


def authorize_jwt(
		authentication_manager: AuthenticationManager, token: str, roles: List[UserRole]) -> PrincipalService:
	return PrincipalService(Authorization(authentication_manager, roles).authorize_by_jwt(token))


def authorize_pat(
		authentication_manager: AuthenticationManager, token: str, roles: List[UserRole]) -> PrincipalService:
	return PrincipalService(Authorization(authentication_manager, roles).authorize_by_pat(token))


def authorize(
		authentication_manager: AuthenticationManager, roles: List[UserRole]
) -> Callable[[str, str], PrincipalService]:
	def get_principal(scheme: str, token: str) -> PrincipalService:
		if scheme == 'Bearer':
			return authorize_jwt(authentication_manager, token, roles)
		elif scheme == 'PAT':
			return authorize_pat(authentication_manager, token, roles)
		else:
			raise AuthFailOn401()

	return get_principal
