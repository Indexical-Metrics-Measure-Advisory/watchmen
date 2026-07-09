from typing import Callable, Optional

from fastapi import FastAPI
from litellm.caching import DiskCache

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

    # def get_o1_model(self):
    #     url = "https://azure-insuremo-gpt4-openai.openai.azure.com"
    #     lm = dspy.LM("azure/o1", api_key="88dfc733a80a4825a46a380a5d878809", api_base=url,
    #                  api_version="2025-01-01-preview")
    #     dspy.configure(lm=lm, adapter=TwoStepAdapter(lm))


    def init_llm_dspy(self):
        import dspy
        # load markdown upload_file
        model = ask_azure_model()
        api_key = ask_azure_api_key()
        api_base = ask_azure_api_base()
        api_version = ask_azure_api_version()

        # dspy.settings.configure(
        #     cache=DiskCache('/tmp/dspy_cache')  # 路径可自定义
        # )

        dspy.configure_cache(enable_disk_cache=True, disk_cache_dir="./watchmen_ai_cache/cache")

        # litellm.drop_params = True
        # url = "https://azure-insuremo-gpt4-openai.openai.azure.com"
        # lm = dspy.LM("azure/gpt_4.1", api_key="88dfc733a80a4825a46a380a5d878809", api_base=url, api_version="2025-01-01-preview")
        lm = dspy.LM(model, api_key=api_key, api_base=api_base, api_version=api_version)
        # lm = dspy.LM("azure/o3", api_key="88dfc733a80a4825a46a380a5d878809", api_base=url,
        #              api_version="2025-01-01-preview",temperature=1)
        # lm = dspy.LM('azure/gpt_4o_mini')
        # lm.kwargs['max_completion_tokens'] = lm.kwargs.pop('max_tokens')
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
