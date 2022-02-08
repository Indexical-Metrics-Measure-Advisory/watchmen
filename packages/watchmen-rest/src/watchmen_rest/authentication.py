from datetime import datetime, timedelta
from typing import Callable, Optional

from jose import JWTError
from jose.jwt import decode, encode
from jsonschema.exceptions import ValidationError

from watchmen_auth import AuthenticationManager, AuthenticationProvider, AuthenticationType
from watchmen_model.admin import User
from .rest_settings import RestSettings
from .util import raise_401


def create_jwt_token(subject: str, expires_delta: timedelta, secret_key: str, algorithm: str) -> str:
	to_encode = {'exp': datetime.now() + expires_delta, 'sub': subject}
	encoded_jwt = encode(to_encode, secret_key, algorithm=algorithm)
	return encoded_jwt


def validate_jwt(token, secret_key: str, algorithm: str):
	try:
		return decode(token, secret_key, algorithms=[algorithm])
	except (JWTError, ValidationError):
		raise_401('Unauthorized caused by unrecognized token.')


class JWTAuthenticationProvider(AuthenticationProvider):
	def __init__(self, secret_key: str, algorithm: str, find_user_by_name: Callable[[str], Optional[User]]):
		self.secret_key = secret_key
		self.algorithm = algorithm
		self.find_user_by_name = find_user_by_name

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.JWT

	def authenticate(self, details: dict) -> Optional[User]:
		token = details['token']
		payload = validate_jwt(token, self.secret_key, self.algorithm)
		username = payload['sub']
		user = self.find_user_by_name(username)
		if user is None:
			raise_401('Unauthorized visit.')
		return user


class PATAuthenticationProvider(AuthenticationProvider):
	def __init__(self, find_user_by_pat: Callable[[str], Optional[User]]):
		self.find_user_by_pat = find_user_by_pat

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.PAT

	def authenticate(self, details: dict) -> Optional[User]:
		token = details['token']
		user = self.find_user_by_pat(token)
		if user is None:
			raise_401('Unauthorized visit.')
		return user


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
