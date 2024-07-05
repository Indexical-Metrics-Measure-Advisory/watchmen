from langchain_community.chat_models import AzureChatOpenAI, ChatOpenAI
from langchain_community.llms.openai import BaseOpenAI, AzureOpenAI


def get_gpt_4():
    return AzureChatOpenAI(
        api_key="88dfc733a80a4825a46a380a5d878809",
        api_version="2023-07-01-preview",
        model="gpt-4-8k",
        azure_deployment="gpt-4-8k",
        azure_endpoint="https://azure-insuremo-gpt4-openai.openai.azure.com",
        temperature=0
    )


class LlmModelBuilder:
    """
    ai model builder
    """

    def __init__(self):
        pass

    @staticmethod
    def get_model() -> BaseOpenAI:
        """
        :return: ai model
        """
        return AzureOpenAI(deployment_name="text_davinci_003", model_name="text-davinci-003")

    @staticmethod
    def get_chat_model() -> ChatOpenAI:
        """
        get chat model
        :return:
        """
        return AzureChatOpenAI(deployment_name="text_davinci_003", model_name="text-davinci-003")

    @staticmethod
    def get_llm_model():
        return AzureChatOpenAI(deployment_name="gpt_35_turbo", model_name="gpt-35-turbo")