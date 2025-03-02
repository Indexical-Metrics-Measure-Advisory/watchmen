from langchain_community.chat_models import AzureChatOpenAI, ChatOpenAI
from langchain_community.embeddings import AzureOpenAIEmbeddings
from langchain_community.llms.openai import BaseOpenAI, AzureOpenAI

from watchmen_ai.llm.base_model_loader import BaseModelLoader
from watchmen_model.system.ai_model import AIModel


class AzureModelLoader(BaseModelLoader):
    """
    ai model builder
    """

    def load_model(self, ai_model_conf: AIModel) -> AzureChatOpenAI:
        return AzureChatOpenAI(
            api_key=ai_model_conf.modelToken,
            api_version=ai_model_conf.modelVersion,
            model=ai_model_conf.modelName,
            azure_deployment=ai_model_conf.modelName.replace("_", ""),
            azure_endpoint=ai_model_conf.baseUrl
        )

    def load_llm_model(self, ai_model_conf: AIModel) -> AzureOpenAI:
        return AzureOpenAI(
            api_key=ai_model_conf.modelToken,
            api_version=ai_model_conf.modelVersion,
            model=ai_model_conf.modelName,
            azure_deployment=ai_model_conf.modelName.replace("_", ""),
            azure_endpoint=ai_model_conf.baseUrl
        )

    def load_embedding_model(self, ai_model_conf: AIModel) -> AzureOpenAIEmbeddings:
        return AzureOpenAIEmbeddings(
            api_key=ai_model_conf.embeddingToken,
            api_version=ai_model_conf.embeddingVersion,
            model=ai_model_conf.embeddingName,
            azure_deployment=ai_model_conf.embeddingName.replace("_", ""),
            azure_endpoint=ai_model_conf.embeddingBaseUrl,
            chunk_size=1
        )

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
