from typing import Optional

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

	def __init__(self, authenticator: AuthenticationManager, role: UserRole):
		self.authenticator = authenticator
		self.role = role

	def get_authenticator(self) -> AuthenticationManager:
		return self.authenticator

	def authorize(self, user: Optional[User]) -> User:
		if user is None:
			raise AuthFailOn401('Unauthorized.')
		if self.role == UserRole.SUPER_ADMIN and user.role != UserRole.SUPER_ADMIN:
			raise AuthFailOn403('Forbidden')
		if self.role == UserRole.CONSOLE and user.role == UserRole.SUPER_ADMIN:
			# super admin cannot do as console user
			raise AuthFailOn403('Forbidden')
		if self.role == UserRole.ADMIN and user.role != UserRole.ADMIN:
			raise AuthFailOn403('Forbidden')

		return user

	def authorize_by_pwd(self, username: str, password: str) -> User:
		return self.authorize(self.authenticator.authenticate_by_pwd(username, password))

	def authorize_by_pat(self, token: str) -> User:
		return self.authorize(self.authenticator.authenticate_by_pat(token))
