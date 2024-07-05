from abc import ABC, abstractmethod

from watchmen_model.system.ai_model import AIModel


class BaseModelLoader(ABC):

    @abstractmethod
    def load_model(self, ai_model_conf: AIModel):
        """
        Load the model
        :param ai_model_conf:
        :return:
        """
        pass

    @abstractmethod
    def load_embedding_model(self, ai_model_conf: AIModel):
        """
        Load the embedding model
        :param ai_model_conf:
        :return:
        """
        pass
