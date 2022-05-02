from typing import Callable, Optional, Tuple

from fastapi import FastAPI

from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_pipeline_surface import pipeline_surface
from watchmen_rest import RestApp
from .settings import DollSettings


class DollApp(RestApp):
	def get_settings(self) -> DollSettings:
		# noinspection PyTypeChecker
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_name()

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_pat()

	def is_tuple_delete_enabled(self) -> bool:
		return self.get_settings().TUPLE_DELETABLE

	def ask_create_pipeline_monitor_topics_on_tenant_create(self) -> bool:
		return self.get_settings().CREATE_PIPELINE_MONITOR_TOPICS_ON_TENANT_CREATE

	def ask_create_dqc_topics_on_tenant_create(self) -> bool:
		return self.get_settings().CREATE_DQC_TOPICS_ON_TENANT_CREATE

	def post_construct(self, app: FastAPI) -> None:
		pass

	# noinspection PyMethodMayBeStatic
	def init_pipeline_surface(self) -> None:
		pipeline_surface.init_connectors()
		pipeline_surface.init_external_writers()

	def on_startup(self, app: FastAPI) -> None:
		self.init_pipeline_surface()


doll = DollApp(DollSettings())


def ask_jwt_params() -> Tuple[str, str]:
	return doll.get_jwt_params()


def ask_access_token_expires_in() -> int:
	return doll.get_access_token_expires_in()


def ask_tuple_delete_enabled() -> bool:
	return doll.is_tuple_delete_enabled()


def ask_create_pipeline_monitor_topics_on_tenant_create() -> bool:
	return doll.ask_create_pipeline_monitor_topics_on_tenant_create()


def ask_create_dqc_topics_on_tenant_create() -> bool:
	return doll.ask_create_dqc_topics_on_tenant_create()
