from __future__ import annotations

from abc import abstractmethod
from enum import Enum
from logging import getLogger
from typing import List, Optional

from watchmen_model.admin import User
from watchmen_utilities import ArrayHelper

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

	def authenticate_details(self, details: dict, auth_type: AuthenticationType) -> Optional[User]:
		return ArrayHelper(self.get_providers()) \
			.filter(lambda x: x.accept(auth_type)) \
			.first(lambda x: x.authenticate(details))

	def authenticate_by_pwd(self, username: str, password: str) -> Optional[User]:
		details = {'username': username, 'password': password}
		user = self.authenticate_details(details, AuthenticationType.PWD)
		return user

	def authenticate_by_pat(self, token: str) -> Optional[User]:
		details = {'token': token}
		user = self.authenticate_details(details, AuthenticationType.PAT)
		return user
