from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_reactor_surface import surface as reactor_surface
from watchmen_rest import RestApp
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from .settings import DollSettings


class DollApp(RestApp):
	def get_settings(self) -> DollSettings:
		# noinspection PyTypeChecker
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_name(self.build_meta_storage())

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_pat(self.build_meta_storage())

	def is_tuple_delete_enabled(self) -> bool:
		return self.get_settings().TUPLE_DELETABLE

	def is_engine_index_enabled(self) -> bool:
		return self.get_settings().ENGINE_INDEX

	def post_construct(self, app: FastAPI) -> None:
		reactor_surface.init_meta_storage(self.retrieve_meta_storage)
		reactor_surface.init_snowflake(self.snowflake_generator)
		reactor_surface.init_authentication(self.authentication_manager)

	# noinspection PyMethodMayBeStatic
	def init_reactor(self) -> None:
		reactor_surface.init_connectors()

	def on_startup(self, app: FastAPI) -> None:
		self.init_reactor()


doll = DollApp(DollSettings())


def ask_meta_storage() -> TransactionalStorageSPI:
	return doll.build_meta_storage()


def ask_snowflake_generator() -> SnowflakeGenerator:
	return doll.get_snowflake_generator()


def ask_jwt_params() -> Tuple[str, str]:
	return doll.get_jwt_params()


def ask_access_token_expires_in() -> int:
	return doll.get_access_token_expires_in()


def ask_tuple_delete_enabled() -> bool:
	return doll.is_tuple_delete_enabled()


def ask_engine_index_enabled() -> bool:
	return doll.is_engine_index_enabled()
