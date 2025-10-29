from datetime import datetime, timedelta
from logging import getLogger
from typing import Callable, List, Optional, Tuple, Dict

from jose import JWTError
from jose.jwt import decode, encode
from jsonschema.exceptions import ValidationError
from starlette.requests import Request

from watchmen_auth import AuthenticationDetails, AuthenticationManager, AuthenticationProvider, AuthenticationScheme, \
	AuthFailOn401, AuthFailOn403, authorize, authorize_token, PrincipalService, ask_tenant_name_http_header_key, \
	ask_user_name_http_header_key, ask_external_auth_on
from watchmen_model.admin import User, UserRole
from watchmen_utilities import ArrayHelper, is_not_blank
from .settings import RestSettings
from .util import raise_401, raise_403

logger = getLogger(__name__)


def create_jwt_token(subject: str, expires_delta: timedelta, secret_key: str, algorithm: str) -> str:
	to_encode = {'exp': datetime.now() + expires_delta, 'sub': subject}
	encoded_jwt = encode(to_encode, secret_key, algorithm=algorithm)
	return encoded_jwt


def validate_jwt(token, secret_key: str, algorithm: str):
	try:
		return decode(token, secret_key, algorithms=[algorithm])
	except (JWTError, ValidationError):
		raise AuthFailOn401('Unauthorized caused by unrecognized token.')


class JWTAuthenticationProvider(AuthenticationProvider):
	def __init__(self, secret_key: str, algorithm: str, find_user_by_name: Callable[[str], Optional[User]]):
		self.secretKey = secret_key
		self.algorithm = algorithm
		self.find_user_by_name = find_user_by_name

	def accept(self, details: AuthenticationDetails) -> bool:
		return is_not_blank(details.scheme) and details.scheme.lower() == AuthenticationScheme.JWT.value.lower()

	def authenticate(self, details: AuthenticationDetails) -> Optional[User]:
		try:
			token = details.token
			payload = validate_jwt(token, self.secretKey, self.algorithm)
			username = payload['sub']
			return self.find_user_by_name(username)
		except AuthFailOn401 as e:
			logger.error(e, exc_info=True, stack_info=True)
			return None
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise AuthFailOn401('Unauthorized visit.')


class PATAuthenticationProvider(AuthenticationProvider):
	def __init__(self, find_user_by_pat: Callable[[str], Optional[User]]):
		self.find_user_by_pat = find_user_by_pat

	def accept(self, details: AuthenticationDetails) -> bool:
		return is_not_blank(details.scheme) and details.scheme.lower() == AuthenticationScheme.PAT.value.lower()

	def authenticate(self, details: AuthenticationDetails) -> Optional[User]:
		token = details.token
		try:
			return self.find_user_by_pat(token)
		except AuthFailOn401 as e:
			logger.error(e, exc_info=True, stack_info=True)
			return None
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise AuthFailOn401('Unauthorized visit.')


def validate_access_token(token: str, user_info_url: str) -> Dict:
	import requests
	headers = {
		"Authorization": f"Bearer {token}",
		"Accept": "application/json"
	}
	response = requests.get(user_info_url, headers=headers)
	if response.status_code == 200:
		payload = response.json()
		return payload
	else:
		raise AuthFailOn401('Unauthorized visit.')
	
	
class OIDCAuthenticationProvider(AuthenticationProvider):
	def __init__(self,
	             user_info_url: str,
	             user_subject_key: str,
	             find_user_by_name: Callable[[str], Optional[User]]):
		self.user_info_url = user_info_url
		self.user_subject_key = user_subject_key
		self.find_user_by_name = find_user_by_name
		
	def accept(self, details: AuthenticationDetails) -> bool:
		return is_not_blank(details.scheme) and details.scheme.lower() == AuthenticationScheme.JWT.value.lower()

	def authenticate(self, details: AuthenticationDetails) -> Optional[User]:
		try:
			token = details.token
			payload = validate_access_token(token, self.user_info_url)
			username = payload[self.user_subject_key]
			return self.find_user_by_name(username)
		except AuthFailOn401 as e:
			logger.error(e, exc_info=True, stack_info=True)
			return None
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise AuthFailOn401('Unauthorized visit.')


class ExternalAuthenticationProvider(AuthenticationProvider):
	def __init__(self, find_user_by_name: Callable[[str], Optional[User]]):
		self.find_user_by_name = find_user_by_name
	
	def accept(self, details: AuthenticationDetails) -> bool:
		return is_not_blank(details.scheme) and details.scheme.lower() == AuthenticationScheme.EXT.value.lower()
	
	def authenticate(self, details: AuthenticationDetails) -> Optional[User]:
		token = details.token
		try:
			return self.find_user_by_name(token)
		except AuthFailOn401 as e:
			logger.error(e, exc_info=True, stack_info=True)
			return None
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise AuthFailOn401('Unauthorized visit.')

	
def build_authentication_manager(
		settings: RestSettings,
		find_user_by_name: Callable[[str], Optional[User]],
		find_user_by_pat: Callable[[str], Optional[User]],
		authentication_providers: List[AuthenticationProvider]
) -> AuthenticationManager:
	authentication_manager = AuthenticationManager()
	authentication_manager.register_provider(
		JWTAuthenticationProvider(settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM, find_user_by_name)
	).register_provider(
		PATAuthenticationProvider(find_user_by_pat)
	).register_provider(
		OIDCAuthenticationProvider(settings.OIDC_USER_INFO_ENDPOINT, settings.OIDC_USER_SUBJECT_KEY, find_user_by_name)
	).register_provider(
		ExternalAuthenticationProvider(find_user_by_name)
	)

	ArrayHelper(authentication_providers) \
		.reduce(lambda x, y: x.register_provider(y), authentication_manager)

	return authentication_manager


def parse_token(request: Request) -> Tuple[str, str]:
	authorization: str = request.headers.get("Authorization")

	print(request.headers)

	if not authorization:
		raise AuthFailOn401('Unauthorized caused by token not found.')
	else:
		scheme, _, param = authorization.partition(" ")
		token = param
		return scheme, token


def parse_header(request: Request) -> Tuple[str, str]:
	user_name_http_header_key = ask_user_name_http_header_key()
	user_name = request.headers.get(user_name_http_header_key)

	if not user_name:
		raise AuthFailOn401('Unauthorized caused by user not found.')
	else:
		return 'external', user_name


def get_principal_by_jwt(
		authentication_manager: AuthenticationManager, token: str, roles: List[UserRole]) -> PrincipalService:
	return authorize_token(authentication_manager, AuthenticationScheme.JWT.value, token, roles)


def get_principal_by_pat(
		authentication_manager: AuthenticationManager, token: str, roles: List[UserRole]) -> PrincipalService:
	return authorize_token(authentication_manager, AuthenticationScheme.PAT.value, token, roles)


def get_principal_by(
		authentication_manager: AuthenticationManager, roles: List[UserRole]
) -> Callable[[Request], PrincipalService]:
	def get_principal(request: Request) -> PrincipalService:
		try:
			if ask_external_auth_on():
				scheme, token = parse_header(request)
			else:
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
