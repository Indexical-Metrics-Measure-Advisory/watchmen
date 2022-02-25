from typing import Callable, List

from watchmen_model.admin import UserRole
from .authentication import AuthenticationManager, AuthenticationType
from .authorization import AuthFailOn401, Authorization
from .principal_service import PrincipalService


def authorize_token(
		authentication_manager: AuthenticationManager,
		token: str, auth_type: AuthenticationType,
		roles: List[UserRole]) -> PrincipalService:
	return PrincipalService(Authorization(authentication_manager, roles).authorize_token(token, auth_type))


def authorize(
		authentication_manager: AuthenticationManager, roles: List[UserRole]
) -> Callable[[str, str], PrincipalService]:
	def get_principal(scheme: str, token: str) -> PrincipalService:
		if scheme == 'Bearer':
			return authorize_token(authentication_manager, token, AuthenticationType.JWT, roles)
		elif scheme == 'pat':
			return authorize_token(authentication_manager, token, AuthenticationType.PAT, roles)
		else:
			raise AuthFailOn401()

	return get_principal
