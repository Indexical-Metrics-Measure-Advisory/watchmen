from enum import Enum
from typing import Optional

from pydantic import Field

from watchmen_model.common import TenantBasedTuple, OptimisticLock
from watchmen_model.common.tuple_ids import AIModelId
from watchmen_utilities import ExtendedBaseModel


class LiteLLMProvider(str, Enum):
    OPENAI = "openai"
    AZURE = "azure"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    DASHSCOPE = "dashscope"
    ZHIPU = "zhipu"
    SPARK = "spark"
    DEEPSEEK = "deepseek"
    MINIMAX = "minimax"
    TONGYI = "tongyi"
    CUSTOM = "custom"


class AIModel(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
    modelId: AIModelId = None
    name: Optional[str] = None
    enabled: Optional[bool] = True
    provider: LiteLLMProvider = LiteLLMProvider.OPENAI
    apiBase: Optional[str] = Field(None, description="Base URL for the API endpoint")
    apiKey: Optional[str] = Field(None, description="API key for authentication")
    apiVersion: Optional[str] = Field(None, description="API version (mainly for Azure)")
    modelName: Optional[str] = Field(None, description="Model name/id e.g. gpt-4, claude-3")
    customLlmProvider: Optional[str] = Field(None, description="Custom LLM provider identifier for LiteLLM")
    timeout: Optional[float] = Field(None, description="Request timeout in seconds")
    temperature: Optional[float] = Field(None, ge=0, le=2, description="Sampling temperature")
    topP: Optional[float] = Field(None, ge=0, le=1, description="Nucleus sampling parameter")
    maxTokens: Optional[int] = Field(None, ge=1, description="Maximum tokens to generate")
    safeMode: Optional[bool] = Field(False, description="Enable safe mode for content filtering")
    dropParams: Optional[bool] = Field(False, description="Drop unsupported params when calling provider")
    telemetry: Optional[bool] = Field(True, description="Enable telemetry for LiteLLM")
    generationUrl: Optional[str] = None
    enableMonitor: Optional[bool] = False
    modelToken: Optional[str] = None
