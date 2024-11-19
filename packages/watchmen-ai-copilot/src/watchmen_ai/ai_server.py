from fastapi import FastAPI
from typing import Callable, Optional

from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_rest import RestApp
from .settings import AISettings


class AIApp(RestApp):

    def get_settings(self) -> AISettings:
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
        pass


ai_app = AIApp(AISettings())
