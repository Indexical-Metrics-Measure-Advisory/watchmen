from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_meta.common import ask_meta_storage
from watchmen_model.admin import User
from watchmen_rest import RestApp
from .settings import DqcSettings


class DqcApp(RestApp):
	def get_settings(self) -> DqcSettings:
		# noinspection PyTypeChecker
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_name(ask_meta_storage())

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_pat(ask_meta_storage())

	def is_tuple_delete_enabled(self) -> bool:
		return self.get_settings().TUPLE_DELETABLE

	def post_construct(self, app: FastAPI) -> None:
		pass

	def on_startup(self, app: FastAPI) -> None:
		pass


dqc = DqcApp(DqcSettings())


def ask_jwt_params() -> Tuple[str, str]:
	return dqc.get_jwt_params()


def ask_access_token_expires_in() -> int:
	return dqc.get_access_token_expires_in()


def ask_tuple_delete_enabled() -> bool:
	return dqc.is_tuple_delete_enabled()
