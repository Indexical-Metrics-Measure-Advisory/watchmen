from typing import Callable, Optional

from fastapi import FastAPI
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat, is_token_revoked
from watchmen_model.admin import User
from watchmen_rest import RestApp

from .settings import TaskHubSettings, taskhub_settings


class TaskHubApp(RestApp):
	def get_settings(self) -> TaskHubSettings:
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		return build_find_user_by_name()

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		return build_find_user_by_pat()

	def build_find_revoked_token(self) -> Callable[[str], bool]:
		return is_token_revoked

	def post_construct(self, app: FastAPI) -> None:
		pass

	def on_startup(self, app: FastAPI) -> None:
		pass


taskhub_app = TaskHubApp(taskhub_settings)
