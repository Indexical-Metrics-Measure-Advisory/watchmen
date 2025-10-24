from fastapi import FastAPI
from typing import Callable, Optional

from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_metricflow.settings import MetricFlowSettings
from watchmen_model.admin import User
from watchmen_rest import RestApp


#


class MetricFlowApp(RestApp):

    def get_settings(self) -> MetricFlowSettings:
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


metric_flow_app = MetricFlowApp(MetricFlowSettings())
