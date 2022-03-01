from __future__ import annotations

from abc import abstractmethod
from enum import Enum
from logging import getLogger
from typing import List, Optional, Tuple

from watchmen_model.admin import User
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class AuthenticationScheme(str, Enum):
	JWT = 'Bearer',
	PAT = 'pat'


class AuthenticationDetails:
	def __init__(self, scheme: str, token: str):
		self.scheme = scheme
		self.token = token


class AuthenticationProvider:
	@abstractmethod
	def accept(self, details: AuthenticationDetails) -> bool:
		pass

	@abstractmethod
	def authenticate(self, details: AuthenticationDetails) -> Optional[User]:
		pass


class AuthenticationManager:
	providers: List[AuthenticationProvider] = []

	def get_providers(self) -> List[AuthenticationProvider]:
		return self.providers

	def register_provider(self, provider: AuthenticationProvider) -> AuthenticationManager:
		self.providers.append(provider)
		return self

	def authenticate_details(self, details: AuthenticationDetails) -> Optional[User]:
		def authenticate_by(provider: AuthenticationProvider) -> Tuple[bool, Optional[User]]:
			user = provider.authenticate(details)
			return (True, user) if user is not None else (False, None)

		return ArrayHelper(self.get_providers()) \
			.filter(lambda x: x.accept(details)) \
			.first(lambda x: authenticate_by(x))

	def authenticate(self, scheme: str, token: str) -> Optional[User]:
		details = AuthenticationDetails(scheme=scheme, token=token)
		user = self.authenticate_details(details)
		return user
