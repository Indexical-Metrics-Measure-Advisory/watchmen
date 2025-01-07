from enum import Enum
from typing import Optional

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple, OptimisticLock
from watchmen_model.common.tuple_ids import AIModelId
from watchmen_utilities import ExtendedBaseModel


class ModelProvider(str, Enum):
    Anthropic = 'Anthropic',
    Microsoft = 'Microsoft',
    OpenAI = 'OpenAI',
    AWS = 'AWS',
    HuggingFace = 'Hugging Face',
    Google = 'Google',
    Ollama = 'Ollama'


class AIModel(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
    modelId: AIModelId = None
    enableMonitor: Optional[bool] = False
    llmProvider: ModelProvider = ModelProvider.Microsoft
    baseUrl: Optional[str] = None
    modelName: Optional[str] = None
    modelVersion: Optional[str] = None
    modelToken: Optional[str] = None
    embeddingProvider: ModelProvider = ModelProvider.Microsoft
    baseEmbeddingUrl: Optional[str] = None
    embeddingName: Optional[str] = None
    embeddingVersion: Optional[str] = None
    embeddingToken: Optional[str] = None