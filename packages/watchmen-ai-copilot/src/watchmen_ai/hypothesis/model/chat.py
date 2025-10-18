from datetime import datetime
from typing import List, Optional, Union, Any, Literal, Annotated

from pydantic import BaseModel, Field, Discriminator
from watchmen_model.common import TenantBasedTuple, TenantId, UserId, UserBasedTuple, OptimisticLock, Auditable
from watchmen_utilities import ExtendedBaseModel


class Message(ExtendedBaseModel):
    """消息基类"""
    id: Optional[str] = None
    type: str
    content: str
    timestamp: Optional[str] = None


# 消息元数据类型定义
class DeveloperMessageMetadata(ExtendedBaseModel):
    """开发者消息元数据"""
    debugInfo: Optional[str] = None
    stackTrace: Optional[List[str]] = None
    timestamp: Optional[str] = None


class SystemMessageMetadata(ExtendedBaseModel):
    """系统消息元数据"""
    systemEvent: Optional[str] = None
    priority: Optional[Literal['low', 'medium', 'high', 'critical']] = None
    timestamp: Optional[str] = None


class AssistantMessageMetadata(ExtendedBaseModel):
    """助手消息元数据"""
    ragSources: Optional[List[str]] = None
    thinkingSteps: Optional[List[str]] = None
    processingTime: Optional[float] = None
    confidence: Optional[float] = None
    modelUsed: Optional[str] = None


class UserMessageMetadata(ExtendedBaseModel):
    """用户消息元数据"""
    timestamp: Optional[str] = None
    userId: Optional[str] = None
    sessionId: Optional[str] = None


class ToolMessageMetadata(ExtendedBaseModel):
    """工具消息元数据"""
    toolName: Optional[str] = None
    toolResult: Optional[Any] = None
    executionTime: Optional[float] = None
    success: Optional[bool] = None
    errorMessage: Optional[str] = None


class ThinkingMessageMetadata(ExtendedBaseModel):
    """思考消息元数据"""
    ragSources: Optional[List[str]] = None
    thinkingSteps: Optional[List[str]] = None
    processingTime: Optional[float] = None


# 具体消息类型定义
class DeveloperMessage(Message):
    """开发者消息"""
    type: Literal['developer'] = 'developer'
    metadata: Optional[DeveloperMessageMetadata] = None


class SystemMessage(Message):
    """系统消息"""
    type: Literal['system'] = 'system'
    metadata: Optional[SystemMessageMetadata] = None


class AssistantMessage(Message):
    """助手消息"""
    type: Literal['assistant'] = 'assistant'
    metadata: Optional[AssistantMessageMetadata] = None


class UserMessage(Message):
    """用户消息"""
    type: Literal['user'] = 'user'
    metadata: Optional[UserMessageMetadata] = None


class ToolMessage(Message):
    """工具消息"""
    type: Literal['tool'] = 'tool'
    metadata: Optional[ToolMessageMetadata] = None


class ThinkingMessage(Message):
    """思考消息"""
    type: Literal['thinking'] = 'thinking'
    metadata: Optional[ThinkingMessageMetadata] = None




# 消息联合类型，用于支持多态序列化
ChatMessage = Annotated[
    Union[
        DeveloperMessage,
        SystemMessage,
        AssistantMessage,
        UserMessage,
        ToolMessage,
        ThinkingMessage
    ],
    Field(discriminator='type')
]


class ChatSession(ExtendedBaseModel, UserBasedTuple, OptimisticLock, Auditable):
    """聊天会话模型"""
    id: str
    title: str
    messages: List[ChatMessage] = []
    analysisType: Optional[str] = None  # 'challenge' | 'business' | 'hypothesis' | 'general'



class SendMessageRequest(ExtendedBaseModel):
    """发送消息请求模型"""
    sessionId: Optional[str] = None
    message: str
    context: Optional[dict] = None


class ChatResponse(ExtendedBaseModel):
    """AI回复响应模型"""
    message: ChatMessage
    sessionId: str
    analysisType: Optional[str] = None
    metadata: Optional[dict] = None


class ChatSuggestion(ExtendedBaseModel):
    """聊天建议模型"""
    id: str
    text: str
    category: str  # 'challenge' | 'business' | 'hypothesis' | 'general'
    priority: int


class CreateSessionRequest(ExtendedBaseModel):
    """创建会话请求模型"""
    title: Optional[str] = None
    analysisType: Optional[str] = None