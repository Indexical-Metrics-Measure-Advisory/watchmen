from enum import Enum
from typing import List, Optional, Any, Union, Dict

from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


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


class ActionParameterType(str, Enum):
    STRING = 'string'
    NUMBER = 'number'
    BOOLEAN = 'boolean'
    EMAIL = 'email'
    URL = 'url'


class ActionTypeParameter(ExtendedBaseModel):
    name: str = None
    type: ActionParameterType = None
    required: bool = False
    description: Optional[str] = None


class ActionType(ExtendedBaseModel, TenantBasedTuple, Auditable, OptimisticLock):
    id: str = None
    name: str = None
    code: str = None  # e.g. 'notification', 'email', 'policy_adjust'
    description: Optional[str] = None
    requiresApproval: bool = False
    enabled: bool = False
    category: str = None  # e.g. 'Notification', 'Policy Operation'
    parameters: Optional[List[ActionTypeParameter]] = None


class SuggestedActionCondition(ExtendedBaseModel):
    metricName: str = None
    operator: str = None  # '>', '<', '>=', '<=', '==', '!='
    value: Union[str, int, float] = None


class SuggestedAction(ExtendedBaseModel, TenantBasedTuple, Auditable, OptimisticLock):
    id: str = None
    name: str = None
    typeId: str = None  # Reference to ActionType
    riskLevel: ActionRiskLevel = None
    description: str = None
    expectedOutcome: Optional[str] = None
    conditions: List[SuggestedActionCondition] = None
    executionMode: ActionExecutionMode = None
    priority: ActionPriority = None
    enabled: bool = False

    # Stats
    executionCount: Optional[int] = None
    successRate: Optional[float] = None
    lastExecuted: Optional[str] = None

    parameters: Optional[Dict[str, Any]] = None
