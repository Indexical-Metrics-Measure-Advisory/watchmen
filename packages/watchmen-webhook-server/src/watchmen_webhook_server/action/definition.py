from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from enum import Enum

class ActionExecutionMode(str, Enum):
    AUTO = 'auto'
    MANUAL = 'manual'
    APPROVAL = 'approval'

class ActionRiskLevel(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

class ActionPriority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'

class ActionTypeParameter(BaseModel):
    name: str
    type: str  # 'string' | 'number' | 'boolean' | 'email' | 'url'
    required: bool
    description: Optional[str] = None

class ActionType(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    requiresApproval: Optional[bool] = None
    enabled: bool
    category: str
    parameters: Optional[List[ActionTypeParameter]] = None

class AlertAction(BaseModel):
    type: str  # Corresponds to ActionType.code
    typeName: Optional[str] = None
    suggestedActionId: Optional[str] = None
    executionMode: Optional[ActionExecutionMode] = None
    target: Optional[str] = None
    template: Optional[str] = None
    riskLevel: Optional[ActionRiskLevel] = None
    name: Optional[str] = None
    content: Optional[str] = None
    expectedEffect: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
