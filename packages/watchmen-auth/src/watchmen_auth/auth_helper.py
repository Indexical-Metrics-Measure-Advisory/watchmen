from typing import Callable, List

from watchmen_model.admin import UserRole
from .authentication import AuthenticationManager
from .authorization import Authorization
from .principal_service import PrincipalService


def authorize_token(
		authentication_manager: AuthenticationManager,
		scheme: str, token: str,
		roles: List[UserRole]) -> PrincipalService:
	return PrincipalService(Authorization(authentication_manager, roles).authorize_token(scheme, token))


def authorize(
		authentication_manager: AuthenticationManager, roles: List[UserRole]
) -> Callable[[str, str], PrincipalService]:
	def get_principal(scheme: str, token: str) -> PrincipalService:
		return authorize_token(authentication_manager, scheme, token, roles)

	return get_principal
