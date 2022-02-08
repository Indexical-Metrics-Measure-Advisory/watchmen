from datetime import datetime, timedelta
from logging import getLogger
from typing import Callable, List, Optional, Tuple

from jose import JWTError
from jose.jwt import decode, encode
from jsonschema.exceptions import ValidationError
from starlette.requests import Request
from watchmen_auth import AuthenticationManager, AuthenticationProvider, AuthenticationType, AuthFailOn401, \
	AuthFailOn403, authorize, authorize_jwt, authorize_pat, PrincipalService
from watchmen_model.admin import User, UserRole

from .rest_settings import RestSettings
from .util import raise_401, raise_403

logger = getLogger(__name__)


def create_jwt_token(subject: str, expires_delta: timedelta, secret_key: str, algorithm: str) -> str:
	to_encode = {'exp': datetime.utcnow() + expires_delta, 'sub': subject}
	encoded_jwt = encode(to_encode, secret_key, algorithm=algorithm)
	return encoded_jwt


def validate_jwt(token, secret_key: str, algorithm: str):
	try:
		return decode(token, secret_key, algorithms=[algorithm])
	except (JWTError, ValidationError):
		raise AuthFailOn401('Unauthorized caused by unrecognized token.')


class JWTAuthenticationProvider(AuthenticationProvider):
	def __init__(self, secret_key: str, algorithm: str, find_user_by_name: Callable[[str], Optional[User]]):
		self.secret_key = secret_key
		self.algorithm = algorithm
		self.find_user_by_name = find_user_by_name

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.JWT

	def authenticate(self, details: dict) -> Optional[User]:
		try:
			token = details['token']
			payload = validate_jwt(token, self.secret_key, self.algorithm)
			username = payload['sub']
			user = self.find_user_by_name(username)
			if user is None:
				raise AuthFailOn401('Unauthorized visit.')
			return user
		except AuthFailOn401 as e:
			raise e
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise AuthFailOn401('Unauthorized visit.')


class PATAuthenticationProvider(AuthenticationProvider):
	def __init__(self, find_user_by_pat: Callable[[str], Optional[User]]):
		self.find_user_by_pat = find_user_by_pat

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.PAT

	def authenticate(self, details: dict) -> Optional[User]:
		token = details['token']
		try:
			user = self.find_user_by_pat(token)
			if user is None:
				raise AuthFailOn401('Unauthorized visit.')
			return user
		except AuthFailOn401 as e:
			raise e
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise AuthFailOn401('Unauthorized visit.')


def build_authentication_manager(
		settings: RestSettings,
		find_user_by_name: Callable[[str], Optional[User]],
		find_user_by_pat: Callable[[str], Optional[User]]
) -> AuthenticationManager:
	authentication_manager = AuthenticationManager()
	authentication_manager.register_provider(
		JWTAuthenticationProvider(settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM, find_user_by_name)
	)
	authentication_manager.register_provider(PATAuthenticationProvider(find_user_by_pat))

	# TODO other authentication providers could be registered here

	return authentication_manager


def parse_token(request: Request) -> Tuple[str, str]:
	authorization: str = request.headers.get("Authorization")

	if not authorization:
		raise AuthFailOn401('Unauthorized caused by token not found.')
	else:
		scheme, _, param = authorization.partition(" ")
		token = param
		return scheme, token


def get_principal_by_jwt(
		authentication_manager: AuthenticationManager, token: str, roles: List[UserRole]) -> PrincipalService:
	return authorize_jwt(authentication_manager, token, roles)


def get_principal_by_pat(
		authentication_manager: AuthenticationManager, token: str, roles: List[UserRole]) -> PrincipalService:
	return authorize_pat(authentication_manager, token, roles)


def get_principal_by(
		authentication_manager: AuthenticationManager, roles: List[UserRole]
) -> Callable[[Request], PrincipalService]:
	def get_principal(request: Request) -> PrincipalService:
		try:
			scheme, token = parse_token(request)
			return authorize(authentication_manager, roles)(scheme, token)
		except AuthFailOn401:
			raise_401('Unauthorized visit.')
		except AuthFailOn403:
			raise_403()

	return get_principal


def get_any_principal_by(authentication_manager: AuthenticationManager) -> Callable[[Request], PrincipalService]:
	"""
	console + admin + super admin
	"""
	return get_principal_by(authentication_manager, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONSOLE])


def get_console_principal_by(authentication_manager: AuthenticationManager) -> Callable[[Request], PrincipalService]:
	"""
	console + admin
	"""
	return get_principal_by(authentication_manager, [UserRole.ADMIN, UserRole.CONSOLE])


def get_admin_principal_by(authentication_manager: AuthenticationManager) -> Callable[[Request], PrincipalService]:
	"""
	admin only
	"""
	return get_principal_by(authentication_manager, [UserRole.ADMIN])


def get_any_admin_principal_by(authentication_manager: AuthenticationManager) -> Callable[[Request], PrincipalService]:
	"""
	super admin + admin
	"""
	return get_principal_by(authentication_manager, [UserRole.SUPER_ADMIN, UserRole.ADMIN])


def get_super_admin_principal_by(authentication_manager: AuthenticationManager) -> Callable[
	[Request], PrincipalService]:
	"""
	super admin only
	"""
	return get_principal_by(authentication_manager, [UserRole.SUPER_ADMIN])
