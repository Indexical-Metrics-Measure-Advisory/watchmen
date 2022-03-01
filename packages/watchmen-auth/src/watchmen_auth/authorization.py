from typing import List, Optional

from watchmen_model.admin import User, UserRole
from .authentication import AuthenticationManager


class AuthFailOn401(Exception):
	pass


class AuthFailOn403(Exception):
	pass


class Authorization:
	"""
	raise AuthFailOn401 or AuthFailOn403 o authorization failed
	"""

	def __init__(self, authenticator: AuthenticationManager, roles: List[UserRole]):
		self.authenticator = authenticator
		self.roles = roles

	def get_authenticator(self) -> AuthenticationManager:
		return self.authenticator

	def authorize(self, user: Optional[User]) -> User:
		if user is None:
			raise AuthFailOn401('Unauthorized.')
		if user.role == UserRole.SUPER_ADMIN:
			if UserRole.SUPER_ADMIN not in self.roles:
				raise AuthFailOn403('Forbidden')
		elif user.role == UserRole.ADMIN:
			if UserRole.ADMIN not in self.roles:
				raise AuthFailOn403('Forbidden')
		elif user.role == UserRole.CONSOLE:
			if UserRole.CONSOLE not in self.roles:
				raise AuthFailOn403('Forbidden')
		else:
			# unsupported role
			raise AuthFailOn403('Forbidden')

		return user

	def authorize_token(self, scheme: str, token: str) -> User:
		return self.authorize(self.authenticator.authenticate(scheme, token))
