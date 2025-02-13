from typing import Callable, Optional


from fastapi import FastAPI
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_rest import RestApp
#
# from .dspy.test import lancedb_retriever
from .settings import AISettings, ask_azure_api_key, ask_azure_api_base, ask_azure_api_version, ask_azure_model


class AIApp(RestApp):

    def get_settings(self) -> AISettings:
        # noinspection PyTypeChecker
        return self.settings

    def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
        """
        autonomous transaction
        """
        return build_find_user_by_name()

    def init_llm_dspy(self):
        import dspy
        # load markdown upload_file
        model = ask_azure_model()
        api_key = ask_azure_api_key()
        api_base = ask_azure_api_base()
        api_version = ask_azure_api_version()
        lm = dspy.LM(model, api_key=api_key, api_base=api_base, api_version=api_version)
        # lm = dspy.LM('azure/gpt_4o_mini')
        dspy.settings.configure(lm=lm)

    def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
        """
        autonomous transaction
        """
        return build_find_user_by_pat()

    def post_construct(self, app: FastAPI) -> None:
        pass

    def on_startup(self, app: FastAPI) -> None:
        self.init_llm_dspy()


ai_app = AIApp(AISettings())
