from typing import Callable, Optional

from fastapi import FastAPI

from watchmen_dqc.boot import init_monitor_jobs
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
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
		return build_find_user_by_name()

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_pat()

	def post_construct(self, app: FastAPI) -> None:
		pass

	def on_startup(self, app: FastAPI) -> None:
		# monitor jobs scheduler must be started within the running event loop,
		# not on module import (post_construct is invoked synchronously at import time)
		init_monitor_jobs()


dqc = DqcApp(DqcSettings())
