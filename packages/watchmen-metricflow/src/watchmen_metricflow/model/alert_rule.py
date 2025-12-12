from enum import Enum
from typing import List, Optional, Union
from datetime import datetime

from pydantic import ConfigDict
from watchmen_utilities import ExtendedBaseModel,Auditable, UserBasedTuple


class AlertPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    CRITICAL = "critical"


class AlertOperator(str, Enum):
    GT = ">"
    LT = "<"
    GE = ">="
    LE = "<="
    EQ = "=="
    NE = "!="


class AlertConditionLogic(str, Enum):
    AND = "and"
    OR = "or"


class AlertActionType(str, Enum):
    EMAIL = "email"
    WEBHOOK = "webhook"
    NOTIFICATION = "notification"
    PROCESS = "process"


class AlertCondition(ExtendedBaseModel):
    field: Optional[str] = None
    operator: Optional[AlertOperator] = None
    value: Optional[Union[float, str]] = None


class LegacyAlertCondition(ExtendedBaseModel):
    operator: AlertOperator
    value: float


class AlertAction(ExtendedBaseModel):
    type: Optional[AlertActionType] = AlertActionType.NOTIFICATION
    riskLevel: Optional[AlertPriority] = None
    name: Optional[str] = None
    content: Optional[str] = None
    expectedEffect: Optional[str] = None
    target: Optional[str] = None
    template: Optional[str] = None


class AlertConfig(ExtendedBaseModel, UserBasedTuple, Auditable):
    enabled: bool = False
    name: Optional[str] = None
    priority: Optional[AlertPriority] = None
    description: Optional[str] = None
    conditionLogic: Optional[AlertConditionLogic] = None
    conditions: Optional[List[AlertCondition]] = None
    condition: Optional[LegacyAlertCondition] = None
    actions: Optional[List[AlertAction]] = None
    nextAction: Optional[AlertAction] = None
    decision: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class GlobalAlertRule(AlertConfig):
    id: str
    metricId: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
