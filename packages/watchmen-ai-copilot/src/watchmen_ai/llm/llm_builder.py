from langchain_community.chat_models import AzureChatOpenAI, ChatOpenAI
from langchain_community.llms.openai import BaseOpenAI, AzureOpenAI


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
