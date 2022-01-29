from __future__ import annotations

from abc import abstractmethod
from enum import Enum
from logging import getLogger
from typing import List, Optional

from watchmen_model.admin import User

logger = getLogger(__name__)


class AuthenticationType(str, Enum):
	PWD = 'pwd',
	PAT = 'pat'


class AuthenticationProvider:
	@abstractmethod
	def accept(self, auth_type: AuthenticationType) -> bool:
		pass

	@abstractmethod
	def authenticate(self, details: dict) -> Optional[User]:
		pass


class AuthenticationManager:
	providers: List[AuthenticationProvider] = []

	def get_providers(self) -> List[AuthenticationProvider]:
		return self.providers

	def register_provider(self, provider: AuthenticationProvider) -> AuthenticationManager:
		self.providers.append(provider)
		return self

	def authenticate_details(self, details: dict, providers: List[AuthenticationProvider]) -> User:


	def authenticate_by_pwd(self, username: str, password: str) -> User:
		details = {'username': username, 'password': password}
		for provider in self.providers:
			if provider.accept(AuthenticationType.PWD):
				user = provider.authenticate(details)
				if user is not None:
					return user

	def authenticate_by_token(self, token: str) -> User:
		pass
