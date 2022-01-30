from typing import Optional

from fastapi import HTTPException
from jose import JWTError
from jose.jwt import decode
from jsonschema.exceptions import ValidationError
from starlette import status

from watchmen_auth import AuthenticationManager, AuthenticationProvider, AuthenticationType
from watchmen_model.admin import User
from watchmen_rest.rest_settings import RestSettings
from watchmen_storage import TransactionalStorageSPI
from .auth_user_service import AuthUserService


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
		self.user_service = AuthUserService(storage)

	def accept(self, auth_type: AuthenticationType) -> bool:
		return auth_type == AuthenticationType.JWT

	def authenticate(self, details: dict) -> Optional[User]:
		token = details['token']
		try:
			payload = validate_jwt(token, self.secret_key, self.algorithm)
		except (JWTError, ValidationError):
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cannot validate credentials.")

		username = payload['sub']
		# TODO get user by user name
		return None


def build_authentication_manager(storage: TransactionalStorageSPI, settings: RestSettings) -> AuthenticationManager:
	authentication_manager = AuthenticationManager()
	authentication_manager.register_provider(
		JWTAuthenticationProvider(storage, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)
	)

	# TODO could register other authentication providers here

	return authentication_manager
