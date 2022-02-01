from datetime import datetime, timedelta
from typing import Callable, Optional

from fastapi import HTTPException
from jose import JWTError
from jose.jwt import decode, encode
from jsonschema.exceptions import ValidationError
from starlette import status

from watchmen_auth import AuthenticationManager, AuthenticationProvider, AuthenticationType
from watchmen_model.admin import User
from watchmen_storage import TransactionalStorageSPI
from .rest_settings import RestSettings


def create_jwt_token(subject: str, expires_delta: timedelta, secret_key: str, algorithm: str) -> str:
	to_encode = {'exp': datetime.now() + expires_delta, 'sub': subject}
	encoded_jwt = encode(to_encode, secret_key, algorithm=algorithm)
	return encoded_jwt


def validate_jwt(token, secret_key: str, algorithm: str):
	try:
		payload = decode(token, secret_key, algorithms=[algorithm])
		return payload
	except (JWTError, ValidationError):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Could not validate credentials",
		)


class JWTAuthenticationProvider(AuthenticationProvider):
	def __init__(
			self, storage: TransactionalStorageSPI, secret_key: str, algorithm: str,
			find_user_by_name: Callable[[str], Optional[User]]
	):
		self.storage = storage
		self.secret_key = secret_key
		self.algorithm = algorithm
		self.find_user_by_name = find_user_by_name

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.JWT

	def authenticate(self, details: dict) -> Optional[User]:
		token = details['token']
		try:
			payload = validate_jwt(token, self.secret_key, self.algorithm)
		except (JWTError, ValidationError):
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cannot validate credentials.")

		username = payload['sub']
		user = self.find_user_by_name(username)
		if user is None:
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Could not validate credentials",
			)
		return user


def build_authentication_manager(
		storage: TransactionalStorageSPI,
		settings: RestSettings,
		find_user_by_name: Callable[[str], Optional[User]]
) -> AuthenticationManager:
	authentication_manager = AuthenticationManager()
	authentication_manager.register_provider(
		JWTAuthenticationProvider(storage, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM, find_user_by_name)
		# TODO PAT authentication provider
	)

	# TODO could register other authentication providers here

	return authentication_manager
