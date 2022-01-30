from typing import Optional

from fastapi import HTTPException
from jose import JWTError
from jose.jwt import decode
from jsonschema.exceptions import ValidationError
from starlette import status

from watchmen_auth import AuthenticationManager, AuthenticationProvider, AuthenticationType
from watchmen_model.admin import User
from watchmen_storage import TransactionalStorageSPI
from .rest_settings import RestSettings


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
	def __init__(self, storage: TransactionalStorageSPI, secret_key: str, algorithm: str):
		self.storage = storage
		self.secret_key = secret_key
		self.algorithm = algorithm

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.JWT

	def authenticate(self, details: dict) -> Optional[User]:
		token = details['token']
		try:
			payload = validate_jwt(token, self.secret_key, self.algorithm)
		except (JWTError, ValidationError):
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
		return payload['sub']


def build_authentication_manager(storage: TransactionalStorageSPI, settings: RestSettings) -> AuthenticationManager:
	authentication_manager = AuthenticationManager()
	authentication_manager.register_provider(
		JWTAuthenticationProvider(storage, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)
	)

	# TODO register other authentication providers here

	return authentication_manager
