from enum import Enum
from typing import List, Optional, Dict, Any

from pydantic import BaseModel

from watchmen_model.common import UserBasedTuple, OptimisticLock, Auditable
from watchmen_utilities import ExtendedBaseModel


class CapabilityType(str, Enum):
    ACTION = 'action'
    KNOWLEDGE = 'knowledge'
    COMMUNICATION = 'communication'




class TaskStatus(str, Enum):
    PENDING = 'pending'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    FAILED = 'failed'


class Priority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'


class CapabilityParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool



class AgentCapability(BaseModel):
    name: str
    description: str
    type: CapabilityType
    parameters: Optional[List[CapabilityParameter]] = None



class AgentRole(str, Enum):
    CLIENT = 'client'
    REMOTE = 'remote'


class AgentCard(ExtendedBaseModel, UserBasedTuple, OptimisticLock,Auditable):
    id: str
    name: str
    description: Optional[str] = None
    role: Optional[AgentRole] = None
    capabilities: Optional[List[AgentCapability]] = []
    supportedContentTypes: Optional[List[str]] =[]
    # lastActive: str
    metadata: Optional[Dict[str, Any]] = None
    isConnecting: bool = False



class Task(BaseModel):
    id: str
    title: str
    description: str
    status: TaskStatus
    priority: Priority
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    client_agent_id: str
    remote_agent_id: str
    artifacts: List['Artifact']
    messages: List['Message']


class Artifact(BaseModel):
    id: str
    task_id: str
    type: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: str


class MessageType(str, Enum):
    CONTEXT = 'context'
    REPLY = 'reply'
    ARTIFACT = 'artifact'
    INSTRUCTION = 'instruction'


class MessagePartMetadata(BaseModel):
    format: Optional[str] = None
    encoding: Optional[str] = None
    schema: Optional[str] = None
    ui_capabilities: Optional[List[str]] = None


class MessagePart(BaseModel):
    type: str
    content: str
    metadata: Optional[MessagePartMetadata] = None


class Message(BaseModel):
    id: str
    task_id: str
    sender_id: str
    receiver_id: str
    type: MessageType
    content: str
    parts: Optional[List[MessagePart]] = None
    created_at: str


class ConnectionStatus(str, Enum):
    CONNECTED = 'connected'
    DISCONNECTED = 'disconnected'


class AgentConnection(BaseModel):
    id: str
    client_agent_id: str
    remote_agent_id: str
    status: ConnectionStatus
    established_at: str
    last_ping_at: str
    metadata: Optional[Dict[str, Any]] = None