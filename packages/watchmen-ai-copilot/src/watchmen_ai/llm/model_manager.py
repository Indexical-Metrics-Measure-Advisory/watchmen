from enum import Enum


class ProviderManager:
    pass


class ModelInstance:
    pass


class ModelType(Enum):
    """
    Enum class for model type.
    """
    LLM = "llm"
    TEXT_EMBEDDING = "text-embedding"
    RERANK = "rerank"
    SPEECH2TEXT = "speech2text"
    MODERATION = "moderation"
    TTS = "tts"
    TEXT2IMG = "text2img"

    @classmethod
    def value_of(cls, origin_model_type: str) -> "ModelType":
        """
        Get model type from origin model type.

        :return: model type
        """
        if origin_model_type == 'text-generation' or origin_model_type == cls.LLM.value:
            return cls.LLM
        elif origin_model_type == 'embeddings' or origin_model_type == cls.TEXT_EMBEDDING.value:
            return cls.TEXT_EMBEDDING
        elif origin_model_type == 'reranking' or origin_model_type == cls.RERANK.value:
            return cls.RERANK
        elif origin_model_type == 'speech2text' or origin_model_type == cls.SPEECH2TEXT.value:
            return cls.SPEECH2TEXT
        elif origin_model_type == 'tts' or origin_model_type == cls.TTS.value:
            return cls.TTS
        elif origin_model_type == 'text2img' or origin_model_type == cls.TEXT2IMG.value:
            return cls.TEXT2IMG
        elif origin_model_type == cls.MODERATION.value:
            return cls.MODERATION
        else:
            raise ValueError(f'invalid origin model type {origin_model_type}')

    def to_origin_model_type(self) -> str:
        """
        Get origin model type from model type.

        :return: origin model type
        """
        if self == self.LLM:
            return 'text-generation'
        elif self == self.TEXT_EMBEDDING:
            return 'embeddings'
        elif self == self.RERANK:
            return 'reranking'
        elif self == self.SPEECH2TEXT:
            return 'speech2text'
        elif self == self.TTS:
            return 'tts'
        elif self == self.MODERATION:
            return 'moderation'
        elif self == self.TEXT2IMG:
            return 'text2img'
        else:
            raise ValueError(f'invalid model type {self}')


class ModelManager:
    def __init__(self) -> None:
        self._provider_manager = ProviderManager()

    def get_model_instance(self, tenant_id: str, provider: str, model_type: ModelType, model: str) -> ModelInstance:
        """
        Get model instance
        :param tenant_id: tenant id
        :param provider: provider name
        :param model_type: model type
        :param model: model name
        :return:
        """
        # if not provider:
        #     return self.get_default_model_instance(tenant_id, model_type)
        #
        # provider_model_bundle = self._provider_manager.get_provider_model_bundle(
        #     tenant_id=tenant_id,
        #     provider=provider,
        #     model_type=model_type
        # )
        pass

        # return ModelInstance(provider_model_bundle, model)
